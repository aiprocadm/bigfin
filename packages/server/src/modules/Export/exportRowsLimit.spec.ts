// © 2026 Bigfin
import {
  exportRowsLimit,
  ExportErrors,
  assertExportRowsWithinLimit,
  isExportOverLimit,
} from './exportRowsLimit';

/**
 * М3 срез 4 (карта v15): в выгрузке стоял `EXPORT_SIZE_LIMIT = 9999999` —
 * не предел, а «бесконечность». При большом объёме выгрузка либо съедала
 * память, либо молча отдавала не всё.
 *
 * Правило продукта: данные не теряются молча. Значит, либо выгрузка полная,
 * либо человеку прямо сказано, чего не хватает.
 */
describe('потолок строк выгрузки', () => {
  it('строк меньше потолка — не мешаем', () => {
    expect(() => assertExportRowsWithinLimit(10, 'items')).not.toThrow();
  });

  it('строк ровно по потолок — всё ещё пропускаем', () => {
    expect(() =>
      assertExportRowsWithinLimit(exportRowsLimit(), 'items'),
    ).not.toThrow();
  });

  it('строк больше потолка — честный отказ с кодом', () => {
    let error: any;

    try {
      assertExportRowsWithinLimit(exportRowsLimit() + 1, 'items');
    } catch (caught) {
      error = caught;
    }
    expect(error?.errorType).toBe('EXPORT_ROWS_LIMIT_EXCEEDED');
  });

  it('в отказе видно, чего и сколько', () => {
    let error: any;

    try {
      assertExportRowsWithinLimit(250000, 'sale_invoice');
    } catch (caught) {
      error = caught;
    }
    // Без этих трёх чисел на экране будет «слишком много» без ориентиров.
    expect(error?.payload).toEqual({
      rowsCount: 250000,
      limit: exportRowsLimit(),
      resource: 'sale_invoice',
    });
  });

  it('проверка «влезает ли» не бросает, а отвечает да/нет', () => {
    // «Выгрузить всё» не должно падать целиком из-за одного большого раздела.
    expect(isExportOverLimit(exportRowsLimit() + 1)).toBe(true);
    expect(isExportOverLimit(exportRowsLimit())).toBe(false);
  });

  it('код ошибки объявлен перечислением', () => {
    expect(ExportErrors.EXPORT_ROWS_LIMIT_EXCEEDED).toBe(
      'EXPORT_ROWS_LIMIT_EXCEEDED',
    );
  });

  it('потолок — настоящее число, а не 9999999', () => {
    expect(exportRowsLimit()).toBeGreaterThan(1000);
    expect(exportRowsLimit()).toBeLessThan(1000000);
  });
});
