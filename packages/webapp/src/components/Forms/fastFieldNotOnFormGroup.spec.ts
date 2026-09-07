import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д4 карты v59. Признак, который ничего не делает.
 *
 * `fastField` — просьба к Formik не перерисовывать поле, пока не изменилось
 * его собственное значение. Понимает её **поле** (`FInputGroup`, `FDateInput`
 * и другие: у них `fastField` есть в объявлении, см. `FieldBaseProps` пакета
 * `@blueprintjs-formik/core`).
 *
 * А `FFormGroup` — это обёртка с подписью. Она признак не читает: пересылает
 * дальше в blueprint-овый `FormGroup`, который о нём не знает. То есть
 * `<FFormGroup fastField>` не ускоряет ничего.
 *
 * Так было в 230 местах — 72 файла. В 177 из них тот же признак стоял и на
 * самом поле, то есть на группе он просто дублировал рабочий. В остальных 53
 * ускорение не включалось вовсе; это записано в задел карты v59 и требует
 * решения владельца (включить его — значит изменить перерисовку форм).
 *
 * Правило: `fastField` не передаётся в `FFormGroup`.
 */
const SRC = path.resolve(__dirname, '..', '..');

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f) && !/\.spec\.tsx$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

const offendersIn = (file: string): number[] => {
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('FFormGroup') || !code.includes('fastField')) return [];

  const sf = ts.createSourceFile(
    file,
    code.replace(/^[ \t]*\/\/[ \t]*@ts-nocheck.*\r?\n/m, ''),
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

    if (open && open.tagName.getText(sf) === 'FFormGroup') {
      const has = open.attributes.properties.some(
        (p) => ts.isJsxAttribute(p) && p.name.getText(sf) === 'fastField',
      );
      if (has) {
        lines.push(sf.getLineAndCharacterOfPosition(open.getStart(sf)).line + 1);
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return lines;
};

describe('fastField не передаётся в FFormGroup', () => {
  it('ни одна группа не просит ускорения, которого не умеет', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      for (const line of offendersIn(file)) {
        offenders.push(`${path.relative(SRC, file)}:${line}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('проверка действительно доходит до форм', () => {
    const withFormGroup = sourceFiles().filter((f) =>
      fs.readFileSync(f, 'utf8').includes('FFormGroup'),
    );
    expect(withFormGroup.length).toBeGreaterThan(50);
  });
});
