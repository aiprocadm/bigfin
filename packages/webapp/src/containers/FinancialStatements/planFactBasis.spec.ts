import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { activeCode } from '@/testing/activeCode';

/**
 * Метод учёта в колонке «Отклонение» (остаток О4 ТЗ).
 *
 * ЧТО БЫЛО НЕ ТАК. У ОПиУ есть переключатель «кассовый / по начислению».
 * Отчёт его слушался, а колонка «Отклонение» — нет: факт она всегда брала
 * по начислению. В итоге на кассовом отчёте план сравнивался с числом,
 * которого на экране нет, и ничего при этом не падало.
 */
const read = (file: string) =>
  activeCode(fs.readFileSync(path.join(__dirname, file), 'utf8'));

describe('колонка «Отклонение» знает метод учёта', () => {
  const hook = read('useReportPlanFact.ts');
  const table = read('ProfitLossSheet/ProfitLossSheetTable.tsx');

  it('метод учёта уходит на сервер', () => {
    expect(hook).toContain('basis');
    expect(hook).toContain('from: fromDate, to: toDate, basis');
  });

  it('метод учёта входит в ключ запроса', () => {
    // Иначе при переключении метода показался бы старый ответ: числа
    // сменились бы, а колонка осталась прежней.
    expect(hook).toContain("['REPORT_PLAN_FACT', report, fromDate, toDate, basis]");
  });

  it('метод берётся из запроса того же отчёта', () => {
    // Не из настроек по умолчанию и не из своего состояния: источник один —
    // тот запрос, которым посчитан отчёт на экране.
    expect(table).toContain('query?.basis');
  });

  it('проверка и правда читает файлы', () => {
    expect(hook.length).toBeGreaterThan(400);
    expect(table.length).toBeGreaterThan(1000);
  });
});
