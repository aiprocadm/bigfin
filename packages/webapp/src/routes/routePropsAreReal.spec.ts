import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д18 карты v76. Свойства маршрута, которых у него нет.
 *
 * У `<Route>` путь задаётся свойством `path`. Свойства `pathname` у маршрута
 * нет вовсе — и если написать его, маршрут остаётся **без пути**, а маршрут без
 * пути совпадает с ЛЮБЫМ адресом.
 *
 * Ошибка тихая: экран открывается, ничего не падает, просто раздел ловит
 * лишнее. Карта v75 нашла её в содержимом настроек; карта v76 — ещё в двух
 * местах (шапка настроек и содержимое раздела). Три раза подряд — значит,
 * нужен сторож, а не третья правка.
 *
 * Проверка типов это ловит, но вызывающие файлы стоят под пометкой «не
 * проверять типы», и там она молчит.
 */
const SRC = path.resolve(__dirname, '..');

/** Тег → свойства, которых у него нет. */
const FORBIDDEN: Record<string, string[]> = {
  Route: ['pathname', 'to'],
};

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f) && !/\.spec\./.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

const offendersIn = (file: string): string[] => {
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('<Route')) return [];

  const sf = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found: string[] = [];

  const visit = (n: ts.Node): void => {
    const open = ts.isJsxElement(n)
      ? n.openingElement
      : ts.isJsxSelfClosingElement(n)
        ? n
        : null;

    if (open) {
      const tag = open.tagName.getText(sf);
      for (const prop of FORBIDDEN[tag] ?? []) {
        const has = open.attributes.properties.some(
          (p) => ts.isJsxAttribute(p) && p.name.getText(sf) === prop,
        );
        if (has) {
          const line =
            sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1;
          found.push(
            `${path.relative(SRC, file)}:${line} → <${tag} ${prop}>`,
          );
        }
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return found;
};

describe('свойства маршрута', () => {
  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы (карта v74).
  it('путь задаётся только через `path`', { timeout: 30_000 }, () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) offenders.push(...offendersIn(file));

    expect(offenders).toEqual([]);
  });

  // Без этой проверки сторож мог бы «зеленеть» просто потому, что не дошёл до
  // файлов с маршрутами.
  it('проверка действительно доходит до маршрутов', { timeout: 30_000 }, () => {
    const withRoutes = sourceFiles().filter((f) =>
      /<Route\b/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(withRoutes.length).toBeGreaterThan(3);
  });
});
