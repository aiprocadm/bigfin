// © 2026 Bigfin
import { CashRollupLeg } from '@/modules/ManagementArticles/queries/ArticlesCashflowRollup.service';
import { CashGroupNode, CashGroupRowType, round2 } from './cashGroupNodes';

/**
 * Группировки по признаку ноги проводки: контрагенты, счета, направления
 * (FT-002 ТЗ-3).
 *
 * КАКАЯ НОГА. Контрагент и направление стоят на ноге «не деньги» — на
 * расчётах с покупателем, на статье расхода; на денежной ноге их обычно нет
 * (так на живых данных стенда). Поэтому для них берутся ноги документа, НЕ
 * касающиеся денег, со знаком «глазами кассы»: кредит такой ноги — это
 * деньги, которые пришли. У сбалансированного документа сумма этих ног
 * равна движению по кассе, поэтому строки сходятся с «Чистым потоком».
 * Для группировки по счетам — наоборот, денежные ноги: счёт и есть касса.
 *
 * Берутся только документы, прошедшие деньгами (признак считается один раз
 * на весь отрезок), и без переводов между своими счетами.
 */

export interface LegDimension {
  /** Какие ноги смотреть. */
  side: 'cash' | 'noncash';
  /** Признак строки: номер контрагента, счёта, направления; `null` — без. */
  keyOf: (leg: CashRollupLeg) => number | null | undefined;
  nameOf: (key: number) => string | undefined;
  /** Часть ключа строки: `inflow-contact-12`. */
  kind: 'contact' | 'account' | 'direction';
  rowType: CashGroupRowType;
  /** Строка «без признака»: её подпись. Нет — строки «без» не бывает. */
  none?: { name: string; labelKey: string };
}

interface Side {
  amounts: Map<number | null, number>;
}

const NONE = null;

export function byLegDimension(
  legs: CashRollupLeg[],
  settledKeys: Set<string>,
  isCashAccount: (accountId: number) => boolean,
  dimension: LegDimension,
): CashGroupNode[] {
  const inflow: Side = { amounts: new Map() };
  const outflow: Side = { amounts: new Map() };

  legs.forEach((leg) => {
    if (!settledKeys.has(`${leg.referenceType}:${leg.referenceId}`)) return;

    const isCash = isCashAccount(leg.accountId);
    if ((dimension.side === 'cash') !== isCash) return;

    const debit = Number(leg.debit || 0);
    const credit = Number(leg.credit || 0);
    // «Глазами кассы»: у денежной ноги приход — дебет, у встречной — кредит.
    const amount = dimension.side === 'cash' ? debit - credit : credit - debit;
    if (amount === 0) return;

    const raw = dimension.keyOf(leg);
    const key = raw === undefined || raw === null ? NONE : Number(raw);
    const side = amount > 0 ? inflow : outflow;
    side.amounts.set(key, (side.amounts.get(key) ?? 0) + Math.abs(amount));
  });

  const children = (side: Side, direction: 'inflow' | 'outflow') => {
    const nodes: CashGroupNode[] = [];

    side.amounts.forEach((amount, key) => {
      if (key === NONE) return;
      nodes.push({
        id: `${direction}-${dimension.kind}-${key}`,
        name: dimension.nameOf(key) ?? `№ ${key}`,
        rowType: dimension.rowType,
        amount: round2(amount),
        children: [],
      });
    });
    nodes.sort((a, b) => b.amount - a.amount);

    // «Без контрагента» — всегда последней и всегда есть: иначе не видно,
    // сколько денег прошло без пометки.
    if (dimension.none) {
      nodes.push({
        id: `${direction}-${dimension.kind}-none`,
        name: dimension.none.name,
        labelKey: dimension.none.labelKey,
        rowType: dimension.rowType,
        amount: round2(side.amounts.get(NONE) ?? 0),
        children: [],
        isNone: true,
      });
    }
    return nodes;
  };

  const inflowChildren = children(inflow, 'inflow');
  const outflowChildren = children(outflow, 'outflow');

  return [
    {
      id: 'inflow',
      name: 'Поступления',
      labelKey: 'cash_flow_articles.inflow',
      rowType: 'INFLOW',
      amount: round2(inflowChildren.reduce((sum, node) => sum + node.amount, 0)),
      children: inflowChildren,
    },
    {
      id: 'outflow',
      name: 'Выплаты',
      labelKey: 'cash_flow_articles.outflow',
      rowType: 'OUTFLOW',
      amount: round2(outflowChildren.reduce((sum, node) => sum + node.amount, 0)),
      children: outflowChildren,
    },
  ];
}

/**
 * Порядок строк в «Итого»: по убыванию суммы, «без признака» — последней.
 *
 * Колонки сводятся по порядку первого появления, и без пересортировки
 * крупнейший контрагент года стоял бы там, где впервые заплатил.
 */
export function sortDimensionRows(nodes: CashGroupNode[]): CashGroupNode[] {
  const list = nodes.map((node) => ({
    ...node,
    children: sortDimensionRows(node.children),
  }));
  const isDimension = list.some((node) =>
    ['CONTACT', 'ACCOUNT', 'DIRECTION'].includes(node.rowType),
  );
  if (!isDimension) return list;

  return list.sort((a, b) => {
    if (Boolean(a.isNone) !== Boolean(b.isNone)) return a.isNone ? 1 : -1;
    return Math.abs(b.amount) - Math.abs(a.amount);
  });
}
