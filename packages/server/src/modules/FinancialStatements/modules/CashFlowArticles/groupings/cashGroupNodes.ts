// © 2026 Bigfin

/**
 * Строки отчёта «Деньги» в любой из шести группировок (FT-002 ТЗ-3).
 *
 * Группировка меняет ТОЛЬКО строки между «Остатком на начало» и «Чистым
 * потоком». Сам поток и остатки считаются по денежным счетам и от
 * группировки не зависят — поэтому они одинаковы на всех вкладках по
 * построению, а не по совпадению. Всё, что строки не объяснили, попадает в
 * «Не разнесено»: деньги не исчезают молча ни в одной группировке.
 */

export const CASHFLOW_GROUPINGS = [
  'articles',
  'activity',
  'contacts',
  'accounts',
  'directions',
  'directions_articles',
] as const;

export type CashFlowGrouping = (typeof CASHFLOW_GROUPINGS)[number];

/** Вид строки: по нему таблица выбирает начертание, экран — подпись. */
export type CashGroupRowType =
  | 'SECTION'
  | 'INFLOW'
  | 'OUTFLOW'
  | 'ARTICLE'
  | 'CONTACT'
  | 'ACCOUNT'
  | 'DIRECTION';

export interface CashGroupNode {
  /** Устойчивый ключ строки: одинаковый во всех колонках. */
  id: string;
  name: string;
  /** Ключ перевода подписи; без него подпись — `name`. */
  labelKey?: string;
  rowType: CashGroupRowType;
  /** Поступления и выплаты — положительные; раздел и направление — знаковые. */
  amount: number;
  children: CashGroupNode[];
  /**
   * Строка «Без контрагента» / «Без направления». Не прячется даже пустой:
   * по ней видно, сколько денег осталось без пометки.
   */
  isNone?: boolean;
}

export const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Сколько денег объяснили строки: поступления минус выплаты.
 *
 * Складываются только ВЕРХНИЕ группы поступлений и выплат: статьи под ними
 * уже вошли в их суммы, и сложить их ещё раз значило бы посчитать дважды.
 */
export function explainedFlow(nodes: CashGroupNode[]): number {
  let total = 0;
  const walk = (list: CashGroupNode[]) =>
    list.forEach((node) => {
      if (node.rowType === 'INFLOW') total += node.amount;
      else if (node.rowType === 'OUTFLOW') total -= node.amount;
      else walk(node.children);
    });
  walk(nodes);
  return round2(total);
}

/**
 * Складывает строки нескольких колонок в одну — так строится «Итого».
 *
 * Строки сводятся по ключу; порядок — порядок первого появления, поэтому
 * контрагент, заплативший только в марте, встаёт в конец, а не теряется.
 */
export function mergeNodes(columns: CashGroupNode[][]): CashGroupNode[] {
  const merge = (target: CashGroupNode[], source: CashGroupNode[]) => {
    source.forEach((node) => {
      const existing = target.find((item) => item.id === node.id);
      if (existing) {
        existing.amount = round2(existing.amount + node.amount);
        merge(existing.children, node.children);
      } else {
        const copy = { ...node, children: [] as CashGroupNode[] };
        target.push(copy);
        merge(copy.children, node.children);
      }
    });
  };

  const result: CashGroupNode[] = [];
  columns.forEach((nodes) => merge(result, nodes));
  return result;
}

/** Значения всех строк по ключу — для раскладки по колонкам таблицы. */
export function nodeValues(nodes: CashGroupNode[], into = new Map<string, number>()) {
  nodes.forEach((node) => {
    into.set(node.id, node.amount);
    nodeValues(node.children, into);
  });
  return into;
}
