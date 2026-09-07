import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д2 карты v63. Подсказка, за которой ничего нет.
 *
 * `<FieldHint />` рисует значок «i» и вешает на него всплывающую подсказку.
 * Если текст не передан, значок всё равно рисуется — а под ним пусто. Человек
 * видит обещание помощи, наводит мышь и не получает ничего.
 *
 * Так было во **всех тридцати** местах продукта: ни в одном не передавали
 * текст. Отдельно обидно, что это не ошибка и не предупреждение — продукт
 * работает, просто молчит там, где обещал объяснить.
 *
 * Правило: у подсказки есть текст.
 */
const SRC = path.resolve(__dirname, '..', '..');
const HINTS = new Set(['FieldHint', 'Hint']);

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f) && !/\.spec\./.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

const emptyHints = (file: string): number[] => {
  const code = fs.readFileSync(file, 'utf8');
  if (!/<(FieldHint|Hint)\b/.test(code)) return [];

  // Пометку «не проверять типы» НЕ снимаем: на разбор она не влияет, а если
  // её вырезать, все номера строк уезжают на единицу — и сторож показывает
  // не то место.
  const sf = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const lines: number[] = [];

  const visit = (n: ts.Node): void => {
    const open = ts.isJsxElement(n)
      ? n.openingElement
      : ts.isJsxSelfClosingElement(n)
        ? n
        : null;

    if (open && HINTS.has(open.tagName.getText(sf))) {
      const hasContent = open.attributes.properties.some(
        (p) =>
          (ts.isJsxAttribute(p) && p.name.getText(sf) === 'content') ||
          ts.isJsxSpreadAttribute(p),
      );
      if (!hasContent) {
        lines.push(sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1);
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return lines;
};

describe('у подсказки есть текст', () => {
  it('нет ни одной подсказки без текста', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      for (const line of emptyHints(file)) {
        offenders.push(`${path.relative(SRC, file)}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('проверка действительно доходит до подсказок', () => {
    const withHints = sourceFiles().filter((f) =>
      /<(FieldHint|Hint)\b/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(withHints.length).toBeGreaterThan(10);
  });
});
