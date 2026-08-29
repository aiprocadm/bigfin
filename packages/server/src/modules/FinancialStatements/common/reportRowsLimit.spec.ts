// © 2026 Bigfin
import {
  reportRowsLimit,
  ReportErrors,
  assertReportRowsWithinLimit,
} from './reportRowsLimit';

/**
 * М3 срез 3 (карта v15): Главная книга и Журнал тянут в память ВСЕ проводки
 * периода. У клиента с годом данных это минутное ожидание или падение.
 *
 * Правило: молча резать отчёт нельзя — либо он полный, либо честный отказ
 * «сузьте период». Поэтому предохранитель именно бросает ошибку.
 */
describe('потолок строк отчёта', () => {
  it('строк меньше потолка — не мешаем', () => {
    expect(() => assertReportRowsWithinLimit(10)).not.toThrow();
  });

  it('строк ровно по потолок — всё ещё пропускаем', () => {
    expect(() => assertReportRowsWithinLimit(reportRowsLimit())).not.toThrow();
  });

  it('строк больше потолка — честный отказ с кодом', () => {
    let error: any;

    try {
      assertReportRowsWithinLimit(reportRowsLimit() + 1);
    } catch (caught) {
      error = caught;
    }
    expect(error?.errorType).toBe('REPORT_ROWS_LIMIT_EXCEEDED');
  });

  it('в отказе есть и потолок, и сколько строк вышло', () => {
    let error: any;

    try {
      assertReportRowsWithinLimit(123456);
    } catch (caught) {
      error = caught;
    }
    // Без этих чисел на экране будет «слишком много» без единого ориентира.
    expect(error?.payload).toEqual({
      rowsCount: 123456,
      limit: reportRowsLimit(),
    });
  });

  it('потолок можно опустить для конкретного отчёта', () => {
    expect(() => assertReportRowsWithinLimit(11, 10)).toThrow();
    expect(() => assertReportRowsWithinLimit(9, 10)).not.toThrow();
  });

  it('код ошибки объявлен перечислением, а не строкой в коде', () => {
    expect(ReportErrors.REPORT_ROWS_LIMIT_EXCEEDED).toBe(
      'REPORT_ROWS_LIMIT_EXCEEDED',
    );
  });

  it('потолок — разумное число, а не бесконечность', () => {
    // 9999999 в лимите выгрузки — ровно та «бесконечность», от которой уходим.
    expect(reportRowsLimit()).toBeGreaterThan(1000);
    expect(reportRowsLimit()).toBeLessThan(1000000);
  });
});
