import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Р1 срез 1 (карта v16): у отчётов «Реализованная» и «Нереализованная
 * курсовая разница» есть маршруты и переводы, но таблица у обоих — пустая
 * оболочка `<FinancialSheet></FinancialSheet>`, а на сервере по ним нет
 * ничего. Человек открывает отчёт и видит пустой лист.
 *
 * Обещание без реализации хуже отсутствия пункта: сторож следит, чтобы
 * пустые оболочки не были подключены к маршрутам.
 */
const REPORTS = path.resolve(__dirname, '..');
const ROUTES = path.resolve(__dirname, '../../../routes/dashboard.tsx');

/**
 * Таблица отчёта, которая ничего не рисует. У пустого элемента форматтер
 * ставит теги вплотную — `></FinancialSheet>`; если внутри есть хоть что-то,
 * такого соседства не будет. Регулярное выражение со `\s*` тут не годится:
 * оно цепляется за `>` последнего вложенного тега.
 */
const isEmptyShell = (source: string) => source.includes('></FinancialSheet>');

const collectEmptyReports = (): string[] => {
  const empty: string[] = [];

  for (const entry of fs.readdirSync(REPORTS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const dir = path.join(REPORTS, entry.name);
    const tables = fs
      .readdirSync(dir)
      .filter((name) => /Table\.tsx$/.test(name));

    if (
      tables.length > 0 &&
      tables.every((name) =>
        isEmptyShell(fs.readFileSync(path.join(dir, name), 'utf8')),
      )
    ) {
      empty.push(entry.name);
    }
  }
  return empty;
};

describe('пустые отчёты не подключены к маршрутам', () => {
  const routes = fs.readFileSync(ROUTES, 'utf8');
  const emptyReports = collectEmptyReports();

  it('папки отчётов вообще нашлись', () => {
    const all = fs
      .readdirSync(REPORTS, { withFileTypes: true })
      .filter((e) => e.isDirectory());

    expect(all.length).toBeGreaterThan(10);
  });

  it('ни одна пустая оболочка не имеет маршрута', () => {
    const reachable = emptyReports.filter((name) =>
      routes.includes(`FinancialStatements/${name}/`),
    );

    expect(reachable).toEqual([]);
  });
});
