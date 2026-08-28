// © 2026 Bigfin
import * as xlsx from 'xlsx';
import { TableSheet } from './TableSheet';

/**
 * Н1 карты v35. В выгрузке отчёта суммы — числа, а не подписи.
 *
 * Экспорт собирается из готовой таблицы отчёта, а в её ячейке лежит
 * только подпись: «2 975 000,00 ₽» — неразрывные пробелы между
 * разрядами, запятая разделителем, знак рубля внутри значения. Для Excel
 * это текст: столбец нельзя сложить, отсортировать по величине или
 * положить в график.
 *
 * Замер по выгрузке баланса: 102 ячейки, числовых — 0. Бухгалтер
 * выгружает отчёт затем, чтобы посчитать, и первым делом чистит файл
 * руками.
 *
 * Правило: подпись, которая является числом, выгружается числом; всё
 * остальное — названия статей, коды, даты — остаётся текстом.
 */
const NBSP = ' ';

const таблица = (значения: string[][]) => ({
  columns: значения[0].map((label, i) => ({ label, key: `k${i}` })),
  rows: значения.slice(1).map((row) => ({
    cells: row.map((value, i) => ({ value, key: `k${i}` })),
  })),
});

/** Ячейки листа: тип и значение. */
const ячейки = (лист: xlsx.WorkSheet) =>
  Object.keys(лист)
    .filter((k) => !k.startsWith('!'))
    .map((k) => ({ адрес: k, тип: лист[k].t, значение: лист[k].v }));

describe('выгрузка отчёта', () => {
  it('сумма с рублём выгружается числом', () => {
    const sheet = new TableSheet(
      таблица([
        ['Название статьи', 'Итого'],
        ['Активы', `2${NBSP}975${NBSP}000,00${NBSP}₽`],
      ]) as any,
    );
    const книга = sheet.convertToXLSX();
    const лист = книга.Sheets[книга.SheetNames[0]];
    const сумма = ячейки(лист).find((c) => c.значение === 2975000);

    expect(сумма).toBeDefined();
    expect(сумма?.тип).toBe('n');
  });

  it('сумма без знака валюты тоже выгружается числом', () => {
    const sheet = new TableSheet(
      таблица([['Итого'], [`120${NBSP}000,00`]]) as any,
    );
    const лист = sheet.convertToXLSX().Sheets['Sheet1'];

    expect(ячейки(лист).some((c) => c.значение === 120000 && c.тип === 'n')).toBe(
      true,
    );
  });

  it('отрицательная сумма сохраняет знак', () => {
    const sheet = new TableSheet(
      таблица([['Итого'], [`-66${NBSP}500,00${NBSP}₽`]]) as any,
    );
    const лист = sheet.convertToXLSX().Sheets['Sheet1'];

    expect(ячейки(лист).some((c) => c.значение === -66500)).toBe(true);
  });

  it('название статьи остаётся текстом', () => {
    const sheet = new TableSheet(
      таблица([['Название'], ['Денежные средства и эквиваленты']]) as any,
    );
    const лист = sheet.convertToXLSX().Sheets['Sheet1'];
    const c = ячейки(лист).find((x) => x.значение === 'Денежные средства и эквиваленты');

    expect(c?.тип).toBe('s');
  });

  it('дата не превращается в число', () => {
    const sheet = new TableSheet(таблица([['Дата'], ['27.08.2026']]) as any);
    const лист = sheet.convertToXLSX().Sheets['Sheet1'];
    const c = ячейки(лист).find((x) => x.значение === '27.08.2026');

    expect(c?.тип).toBe('s');
  });

  it('пустая ячейка остаётся пустой', () => {
    const sheet = new TableSheet(таблица([['Итого'], ['']]) as any);
    const лист = sheet.convertToXLSX().Sheets['Sheet1'];

    expect(ячейки(лист).some((c) => c.значение === 0)).toBe(false);
  });

  it('в CSV сумма печатается числом, без знака валюты и пробелов', () => {
    const sheet = new TableSheet(
      таблица([['Итого'], [`2${NBSP}975${NBSP}000,00${NBSP}₽`]]) as any,
    );

    expect(sheet.convertToCSV()).toContain('2975000');
  });
});
