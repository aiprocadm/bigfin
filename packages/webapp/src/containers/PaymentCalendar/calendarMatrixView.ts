// © 2026 Bigfin
import moment from 'moment';

/**
 * Раскладка матрицы «план / факт» (FT-050 ТЗ-3) в строки таблицы. Без
 * React — её держат тесты.
 */

export type MatrixSideKey = 'plan' | 'fact';

interface Cell {
  value: number;
  /** Плановый остаток ниже нуля — кассовый разрыв. */
  gap?: boolean;
}

export interface MatrixRowView {
  key: 'opening' | 'inflow' | 'outflow' | 'change' | 'closing';
  strong: boolean;
  cells: Cell[];
  children: Array<{ key: string; name: string | null; cells: Cell[] }>;
}

const side = (column: any, name: MatrixSideKey) => column?.[name] ?? {};

/** Подпись колонки: месяц словом, неделя — датой начала, квартал — ключом. */
export function columnLabel(column: { key: string; from: string }): string {
  if (/^\d{4}-\d{2}$/.test(column.key)) return moment(`${column.key}-01`).format('MMM YYYY');
  if (/^\d{4}-\d{2}-\d{2}$/.test(column.key)) return moment(column.from).format('DD.MM');
  return column.key.replace('-Q', ' Q');
}

export function matrixRowsView(data: any) {
  const columns: any[] = data?.columns ?? [];
  const pair = (pick: (column: any, name: MatrixSideKey) => number, gapOnPlan = false): Cell[] =>
    columns.flatMap((column) => [
      { value: pick(column, 'plan'), gap: gapOnPlan && pick(column, 'plan') < 0 },
      { value: pick(column, 'fact') },
    ]);
  const groupRows = (groups: any[]) =>
    (groups ?? []).map((group) => ({
      key: String(group.key ?? '∅'),
      name: group.key === 'transfer' ? null : group.name ?? null,
      cells: (group.cells ?? []).flatMap((cell: any) => [{ value: Number(cell.plan) }, { value: Number(cell.fact) }]),
    }));

  const rows: MatrixRowView[] = [
    { key: 'opening', strong: true, cells: pair((c, s) => Number(side(c, s).opening)), children: [] },
    { key: 'inflow', strong: false, cells: pair((c, s) => Number(side(c, s).inflow)), children: groupRows(data?.inflowGroups ?? data?.inflow_groups) },
    { key: 'outflow', strong: false, cells: pair((c, s) => Number(side(c, s).outflow)), children: groupRows(data?.outflowGroups ?? data?.outflow_groups) },
    { key: 'change', strong: false, cells: pair((c, s) => Number(side(c, s).change)), children: [] },
    {
      key: 'closing',
      strong: true,
      cells: pair((c, s) => Number(side(c, s).closing), true),
      // Раскрытие по счетам: остатки каждого денежного счёта на конец.
      children: (data?.accounts ?? []).map((account: any) => ({
        key: `account-${account.accountId ?? account.account_id}`,
        name: account.name ?? null,
        cells: (account.cells ?? []).flatMap((cell: any) => [
          { value: Number(cell.planClosing ?? cell.plan_closing) },
          { value: Number(cell.factClosing ?? cell.fact_closing) },
        ]),
      })),
    },
  ];
  return {
    columns: columns.map((column) => ({ key: column.key, label: columnLabel(column), gap: !!column.gap })),
    rows,
  };
}
