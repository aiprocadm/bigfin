import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

/**
 * Д4 карты v61. Крючок вернул пару, а сказал «массив чего-то».
 *
 * Крючок вида `useState` возвращает **пару**: значение и то, чем его менять.
 * Если тип возврата не объявлен, проверка выводит его как «массив, каждая
 * часть которого — значение ИЛИ функция». После этого нельзя ни прочитать
 * значение (у функции нет таких свойств), ни вызвать установщик (значение не
 * вызывается). Каждое использование становится ошибкой.
 *
 * Так было у трёх отчётов (обороты по поставщикам, по покупателям, сводка по
 * налогу с продаж) и у `useLocalStorage` с `useSplashLoading`. И в самом
 * крючке разбора строки запроса: там тип был записан объектом с номерными
 * ключами — по форме похоже на пару, но объект нельзя разобрать как массив,
 * и 21 место считалось ошибкой.
 *
 * Правило: если крючок возвращает пару, тип возврата объявлен явно.
 *
 * Список из двух объектов (например, описание двух столбцов таблицы) — не
 * пара; такие возвраты правило не трогает.
 */
const SRC = path.resolve(__dirname, '..');

const sourceFiles = (): string[] =>
  fs
    .readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.d\.ts$|\.spec\./.test(f))
    .map((f) => path.join(SRC, f))
    .filter((f) => fs.statSync(f).isFile());

const undeclaredPairs = (file: string): string[] => {
  const code = fs.readFileSync(file, 'utf8');
  if (!/\buse[A-Z]/.test(code)) return [];

  const sf = ts.createSourceFile(
    file,
    code.replace(/^[ \t]*\/\/[ \t]*@ts-nocheck.*\r?\n/m, ''),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];

  const visit = (n: ts.Node): void => {
    let name: string | null = null;
    let fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression | null =
      null;

    if (ts.isFunctionDeclaration(n) && n.name) {
      name = n.name.text;
      fn = n;
    } else if (
      ts.isVariableDeclaration(n) &&
      n.initializer &&
      (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))
    ) {
      name = n.name.getText(sf);
      fn = n.initializer;
    }

    if (name && /^use[A-Z]/.test(name) && fn && !fn.type && fn.body && ts.isBlock(fn.body)) {
      const last = fn.body.statements[fn.body.statements.length - 1];
      if (
        last &&
        ts.isReturnStatement(last) &&
        last.expression &&
        ts.isArrayLiteralExpression(last.expression) &&
        last.expression.elements.length === 2 &&
        // список объектов — это не пара «значение и установщик»
        !last.expression.elements.some((e) => ts.isObjectLiteralExpression(e))
      ) {
        found.push(name);
      }
    }
    n.forEachChild(visit);
  };
  visit(sf);
  return found;
};

describe('крючок, возвращающий пару, объявляет её типом', () => {
  it('нет крючков с невыведенной парой', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles()) {
      for (const name of undeclaredPairs(file)) {
        offenders.push(`${path.relative(SRC, file)} → ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('разбор строки запроса объявлен именно парой, а не объектом', () => {
    const code = fs.readFileSync(path.join(SRC, 'hooks/useQueryString.ts'), 'utf8');
    expect(code).toMatch(/export type QueryStringResult = \[/);
  });
});
