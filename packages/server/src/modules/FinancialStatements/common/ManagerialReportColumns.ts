// © 2026 Bigfin
import { ITableColumn } from '../types/Table.types';

/**
 * Колонки управленческого отчёта-матрицы: «Название · периоды · Итого»
 * (FT-001 ТЗ-3).
 *
 * Одно место на все управленческие матрицы — ДДС сейчас, ОПиУ по ярусам
 * следом. Отчёты, у которых колонки устроены по-разному, читаются по-разному,
 * а человек, открывший оба, ждёт одинаковых колонок.
 *
 * `cellIndex` — номер ячейки в строке. По нему витрина раскладывает ячейки
 * по колонкам, а выгрузка в CSV/XLSX идёт по порядку ячеек — поэтому порядок
 * колонок и порядок ячеек в строке обязаны совпадать.
 */

export const NAME_COLUMN_KEY = 'name';
export const TOTAL_COLUMN_KEY = 'total';

export interface ManagerialPeriodColumnSource {
  key: string;
  label: string;
  fromDate: string;
  toDate: string;
  isPartial: boolean;
}

export interface IManagerialReportColumn extends ITableColumn {
  /** Границы периода — чтобы экран подписал колонку сам, на своём языке. */
  fromDate?: string;
  toDate?: string;
  /** Период обрезан границей отчёта (подпись датами, а не «Январь»). */
  isPartial?: boolean;
  isTotal?: boolean;
}

/**
 * Нужна ли колонка «Итого».
 *
 * При ОДНОМ периоде она повторяла бы его копейка в копейку — лишняя колонка
 * рядом с такой же приучает не смотреть ни на одну из них.
 */
export function hasTotalColumn(
  periodsCount: number,
  showTotalColumn: boolean | undefined,
): boolean {
  return showTotalColumn !== false && periodsCount > 1;
}

export function managerialReportColumns(input: {
  nameLabel: string;
  totalLabel: string;
  periods: ManagerialPeriodColumnSource[];
  showTotalColumn?: boolean;
}): IManagerialReportColumn[] {
  const columns: IManagerialReportColumn[] = [
    { key: NAME_COLUMN_KEY, label: input.nameLabel, cellIndex: 0 },
    ...input.periods.map((period, index) => ({
      key: period.key,
      label: period.label,
      cellIndex: index + 1,
      fromDate: period.fromDate,
      toDate: period.toDate,
      isPartial: period.isPartial,
    })),
  ];

  if (hasTotalColumn(input.periods.length, input.showTotalColumn)) {
    columns.push({
      key: TOTAL_COLUMN_KEY,
      label: input.totalLabel,
      cellIndex: columns.length,
      isTotal: true,
    });
  }

  return columns;
}
