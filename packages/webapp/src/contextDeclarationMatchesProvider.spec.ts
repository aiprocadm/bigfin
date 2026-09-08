import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д3 карты v58. Объявление контекста отстало от поставщика.
 *
 * Контекст формы объявляет, что в нём лежит:
 *
 *     interface InvoiceFormContextValue { … }
 *     const InvoiceFormContext = createContext<InvoiceFormContextValue>(…)
 *
 * Поставщик кладёт туда объект. Если объявление перечисляет два поля, а
 * поставщик кладёт тридцать, то **каждое** чтение остальных двадцати восьми
 * считается ошибкой — «такого свойства нет».
 *
 * Так и было: у пяти форм продаж объявление знало ровно по два поля. Кто-то
 * добавил узкий интерфейс ради двух новых значений, и всё остальное выпало
 * из объявления. 131 замечание.
 *
 * Почему сторож: файлы, которые читают из контекста, стоят под пометкой «не
 * проверять типы». Добавить полю место в поставщике и забыть про объявление
 * можно совершенно молча — никто не заметит, пока файл не выйдет из слепой
 * зоны.
 *
 * Правило: каждое поле, которое поставщик кладёт в контекст, объявлено в
 * типе этого контекста.
 */
const SRC = path.resolve(__dirname);

interface Mismatch {
  file: string;
  type: string;
  missing: string[];
}

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx$/.test(f) && !/\.spec\.tsx$/.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

/** Имя типа контекста: `createContext<T>(…)` либо `createContext({} as T)`. */
const contextTypeName = (sf: ts.SourceFile): string | null => {
  let name: string | null = null;
  const visit = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      /(^|\.)createContext$/.test(n.expression.getText(sf))
    ) {
      const fromTypeArg = n.typeArguments?.[0]?.getText(sf);
      const arg = n.arguments[0];
      const fromAssertion =
        arg && ts.isAsExpression(arg) ? arg.type.getText(sf) : undefined;
      name = fromTypeArg ?? fromAssertion ?? name;
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return name && /^[A-Z]\w*$/.test(name) ? name : null;
};

/** Поля объекта, который передан в `<X.Provider value={…}>`. */
const providedFields = (
  sf: ts.SourceFile,
): { fields: string[]; spread: boolean } => {
  const fields: string[] = [];
  let spread = false;

  const collect = (obj: ts.ObjectLiteralExpression): void => {
    for (const p of obj.properties) {
      if (ts.isSpreadAssignment(p)) spread = true;
      else if (p.name) fields.push(p.name.getText(sf));
    }
  };
  const resolve = (id: ts.Identifier): ts.ObjectLiteralExpression | null => {
    let found: ts.ObjectLiteralExpression | null = null;
    const walk = (n: ts.Node): void => {
      if (
        ts.isVariableDeclaration(n) &&
        n.name.getText(sf) === id.getText(sf) &&
        n.initializer &&
        ts.isObjectLiteralExpression(n.initializer)
      ) {
        found = n.initializer;
      }
      n.forEachChild(walk);
    };
    walk(sf);
    return found;
  };

  const visit = (n: ts.Node): void => {
    if (
      (ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) &&
      /\.Provider$/.test(n.tagName.getText(sf))
    ) {
      for (const a of n.attributes.properties) {
        if (
          ts.isJsxAttribute(a) &&
          a.name.getText(sf) === 'value' &&
          a.initializer &&
          ts.isJsxExpression(a.initializer) &&
          a.initializer.expression
        ) {
          const expr = a.initializer.expression;
          if (ts.isObjectLiteralExpression(expr)) collect(expr);
          else if (ts.isIdentifier(expr)) {
            const obj = resolve(expr);
            if (obj) collect(obj);
            else spread = true; // состав неизвестен — не судим
          } else spread = true;
        }
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return { fields, spread };
};

/** Поля, перечисленные в объявлении типа (интерфейс в том же файле). */
const declaredFields = (sf: ts.SourceFile, type: string): string[] | null => {
  let members: string[] | null = null;
  const visit = (n: ts.Node): void => {
    if (ts.isInterfaceDeclaration(n) && n.name.text === type) {
      members = n.members
        .map((m) => m.name?.getText(sf))
        .filter((x): x is string => Boolean(x));
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return members;
};

const findMismatches = (): Mismatch[] => {
  const out: Mismatch[] = [];

  for (const file of sourceFiles()) {
    const code = fs.readFileSync(file, 'utf8');
    if (!/createContext/.test(code) || !/\.Provider/.test(code)) continue;

    const sf = ts.createSourceFile(
      file,
      code.replace(/^[ \t]*\/\/[ \t]*@ts-nocheck.*\r?\n/m, ''),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const type = contextTypeName(sf);
    if (!type) continue; // контекст без объявленного типа — не наш случай

    const declared = declaredFields(sf, type);
    if (declared === null) continue; // объявление лежит в другом файле

    const { fields, spread } = providedFields(sf);
    if (spread || !fields.length) continue; // состав перечислить нельзя

    const missing = fields.filter((f) => !declared.includes(f));
    if (missing.length) {
      out.push({ file: path.relative(SRC, file), type, missing });
    }
  }
  return out;
};

describe('объявление контекста не отстаёт от поставщика', () => {
  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы — в одиночку идёт секунды, в полном прогоне вдвое
  // дольше (карта v74).
  it('каждое положенное в контекст поле объявлено в его типе', { timeout: 30_000 }, () => {
    expect(
      findMismatches().map((m) => `${m.file} (${m.type}): ${m.missing.join(', ')}`),
    ).toEqual([]);
  });

  // Сторож читает все файлы витрины, и под общей нагрузкой пять секунд по
  // умолчанию ему малы — в одиночку идёт секунды, в полном прогоне вдвое
  // дольше (карта v74).
  it('проверка действительно доходит до контекстов форм', { timeout: 30_000 }, () => {
    const invoice = path.join(
      SRC,
      'containers/Sales/Invoices/InvoiceForm/InvoiceFormProvider.tsx',
    );
    const sf = ts.createSourceFile(
      invoice,
      fs.readFileSync(invoice, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    expect(contextTypeName(sf)).toBe('InvoiceFormContextValue');
    expect(providedFields(sf).fields.length).toBeGreaterThan(20);
  });
});
