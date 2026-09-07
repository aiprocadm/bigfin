import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д3 карты v65. Значок, которого не видно.
 *
 * В продукте **два разных компонента с именем `Icon`**: наш (рисует значок из
 * `static/json/icons`) и blueprint-овский. Имена значков у них разные: у нас
 * `smallCross` и `arrowRight`, у blueprint — `small-cross` и `arrow-right`.
 *
 * Если нашему `Icon` дать имя, которого в нашем наборе нет, он вернёт `null`:
 * ни ошибки, ни предупреждения — просто пустое место там, где ожидался
 * значок. Так было в двух местах шапки бокового меню.
 *
 * Отдельно: размер наш `Icon` читает из `iconSize`. Свойство `size` (так
 * называется оно у blueprint) он не читает вовсе — значок молча рисуется
 * размером по умолчанию.
 *
 * Смотреть надо по ввозу, а не по имени тега. При первой попытке этой карты
 * я посчитал все `<Icon>` нашими и «починил» шесть blueprint-овских значков,
 * сломав правильные имена. Правки отменены, разбор переписан.
 *
 * Правило: у нашего `Icon` имя значка есть в нашем наборе, а размер задаётся
 * через `iconSize`.
 */
const SRC = path.resolve(__dirname, '..', '..');

/** Имена значков нашего набора. */
const ourIconNames = (): Set<string> => {
  const code = fs.readFileSync(path.join(SRC, 'static/json/icons.tsx'), 'utf8');
  return new Set([...code.matchAll(/^ {2}'?([\w-]+)'?\s*:\s*\{/gm)].map((m) => m[1]));
};

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f) && !/\.spec\./.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

/** Откуда в этот файл ввезён `Icon`; null — если не ввозится. */
const iconImportedFrom = (sf: ts.SourceFile): string | null => {
  let from: string | null = null;
  const visit = (n: ts.Node): void => {
    if (
      ts.isImportDeclaration(n) &&
      n.importClause?.namedBindings &&
      ts.isNamedImports(n.importClause.namedBindings) &&
      n.importClause.namedBindings.elements.some((e) => e.name.text === 'Icon')
    ) {
      from = (n.moduleSpecifier as ts.StringLiteral).text;
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return from;
};

const problemsIn = (file: string, names: Set<string>): string[] => {
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('<Icon')) return [];

  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const from = iconImportedFrom(sf);
  if (from === null || from.startsWith('@blueprintjs')) return []; // не наш Icon

  const found: string[] = [];
  const visit = (n: ts.Node): void => {
    const open = ts.isJsxElement(n)
      ? n.openingElement
      : ts.isJsxSelfClosingElement(n)
        ? n
        : null;

    if (open && open.tagName.getText(sf) === 'Icon') {
      const line = sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1;
      const where = `${path.relative(SRC, file)}:${line}`;

      for (const p of open.attributes.properties) {
        if (!ts.isJsxAttribute(p) || !p.initializer) continue;
        const prop = p.name.getText(sf);

        if (prop === 'size') found.push(`${where} → size вместо iconSize`);

        if (prop === 'icon') {
          const init = p.initializer;
          const literal = ts.isStringLiteral(init)
            ? init.text
            : ts.isJsxExpression(init) &&
                init.expression &&
                ts.isStringLiteral(init.expression)
              ? init.expression.text
              : null;
          if (literal && !names.has(literal)) {
            found.push(`${where} → значка "${literal}" нет в наборе`);
          }
        }
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return found;
};

describe('значки нашего Icon существуют', () => {
  it('нет ни одного значка не из нашего набора и ни одного size', () => {
    const names = ourIconNames();
    const problems: string[] = [];
    for (const file of sourceFiles()) problems.push(...problemsIn(file, names));

    expect(problems).toEqual([]);
  });

  it('набор значков и наши использования действительно читаются', () => {
    expect(ourIconNames().size).toBeGreaterThan(100);
    const ours = sourceFiles().filter((f) => {
      const code = fs.readFileSync(f, 'utf8');
      if (!code.includes('<Icon')) return false;
      const sf = ts.createSourceFile(f, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const from = iconImportedFrom(sf);
      return from !== null && !from.startsWith('@blueprintjs');
    });
    expect(ours.length).toBeGreaterThan(20);
  });
});
