// © 2026 Bigfin
import { formatNumber } from '@/utils/format-number';
import { AiCfoIntent } from './intentClassifier';

/**
 * Доказательная база ответа AI CFO (FT-102 ТЗ-3) — ТОЛЬКО из расчётов.
 *
 * Здесь нет модели. Каждая функция берёт готовые ответы отчётов (ОДДС по
 * статьям, управленческий ОПиУ, свёртка статей, долги, разрывы) и собирает
 * ответ: главный вывод, числа, причины, таблицу, ссылки «Показать операции»
 * и предложенные действия. Текст вывода — по шаблону из этих же чисел,
 * поэтому совпадает с отчётом по построению (AC 1). Модель, если подключена,
 * только пересказывает это своими словами, и её числа проверяются.
 *
 * Ответы отчётов приходят как с сервера — в snake_case.
 */
export interface Period {
  fromDate: string;
  toDate: string;
}

/** Что открыть по «Показать операции»: та же панель, что у ячейки отчёта. */
export interface DrillTarget {
  articleId?: number;
  accountId?: number;
  plType?: string;
  fromDate: string;
  toDate: string;
  basis?: 'cash' | 'accrual';
  title?: string;
}

export interface Figure {
  key: string;
  label: string;
  value: number | null;
  kind: 'money' | 'percent' | 'date' | 'count';
  /** Дата — для `kind: 'date'`. */
  date?: string;
  drill?: DrillTarget;
  link?: string;
}

export interface Reason {
  text: string;
  figureKey?: string;
}

/**
 * Предложенное действие. AI НИЧЕГО НЕ МЕНЯЕТ (правило 4): это описание кнопки,
 * которую нажимает человек; сначала — предпросмотр последствий, потом — его
 * подтверждение, и только тогда витрина зовёт обычную ручку продукта с
 * правами самого человека.
 */
export interface AiCfoAction {
  kind: 'reschedule_planned_operation';
  label: string;
  plannedOperationId: number;
  amount: number;
  fromDate: string;
  toDate: string;
  preview: { method: 'POST'; path: string; body: Record<string, unknown> };
  execute: { method: 'POST'; path: string; body: Record<string, unknown> };
  requiresConfirmation: true;
}

export interface AiCfoAnswer {
  intent: AiCfoIntent;
  period: Period;
  base: Period | null;
  /** Данных за период нет — ответ так и говорит, без гипотез (правило 5). */
  empty: boolean;
  headline: string;
  figures: Figure[];
  reasons: Reason[];
  table?: { columns: string[]; rows: Array<Array<string | number | null>> };
  actions: AiCfoAction[];
  links: Array<{ label: string; href: string }>;
}

const EPS = 0.005;
const abs = Math.abs;
export const money = (value: number, currency = 'RUB') => formatNumber(value, { currencyCode: currency, money: true });
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Рост в процентах; `null` — базы нет (правило 6: «нет базы», не «+100 %»). */
export function growthPercent(current: number, base: number): number | null {
  if (abs(base) < EPS) return null;
  return Math.round(((current - base) / abs(base)) * 1000) / 10;
}

const registryLink = (period: Period, extra = '') =>
  `/cashflow-accounts/transactions?from_date=${period.fromDate}&to_date=${period.toDate}${extra}`;

// ---------- ОДДС по статьям ----------

export interface CashArticle {
  articleId: number;
  name: string;
  side: 'inflow' | 'outflow';
  amount: number;
}

/** Листья дерева «Денег по статьям» с направлением: родитель — сумма детей, его не берём. */
export function cashArticles(report: any): CashArticle[] {
  const out: CashArticle[] = [];
  const walk = (node: any, side: 'inflow' | 'outflow' | null) => {
    const rowType = String(node?.row_type ?? node?.rowType ?? '');
    const nextSide = rowType === 'INFLOW' ? 'inflow' : rowType === 'OUTFLOW' ? 'outflow' : side;
    const children = node?.children ?? [];
    const match = /^article-(\d+)$/.exec(String(node?.id ?? ''));
    if (children.length === 0 && match && nextSide) {
      out.push({ articleId: Number(match[1]), name: node.name, side: nextSide, amount: Number(node.amount) || 0 });
    }
    children.forEach((child: any) => walk(child, nextSide));
  };
  (report?.data?.rows ?? []).forEach((row: any) => walk(row, null));
  return out;
}

const cashTotals = (report: any) => {
  const data = report?.data ?? {};
  const articles = cashArticles(report);
  return {
    opening: Number(data.opening_balance) || 0,
    closing: Number(data.closing_balance) || 0,
    net: Number(data.net_cash_flow) || 0,
    unclassified: Number(data.unclassified) || 0,
    inflow: articles.filter((a) => a.side === 'inflow').reduce((s, a) => s + a.amount, 0),
    outflow: articles.filter((a) => a.side === 'outflow').reduce((s, a) => s + a.amount, 0),
    articles,
  };
};

const cashEmpty = (t: ReturnType<typeof cashTotals>) =>
  abs(t.net) < EPS && abs(t.inflow) < EPS && abs(t.outflow) < EPS && abs(t.unclassified) < EPS;

const emptyAnswer = (intent: AiCfoIntent, period: Period, base: Period | null): AiCfoAnswer => ({
  intent,
  period,
  base,
  empty: true,
  headline: `За период ${period.fromDate} — ${period.toDate} операций нет: объяснять нечего.`,
  figures: [],
  reasons: [],
  actions: [],
  links: [{ label: 'Реестр операций за период', href: registryLink(period) }],
});

/** «Почему денег стало меньше?» */
export function cashDecrease(current: any, previous: any, period: Period, base: Period, currency: string): AiCfoAnswer {
  const cur = cashTotals(current);
  const prev = cashTotals(previous);
  if (cashEmpty(cur)) return emptyAnswer('cash_decrease', period, base);

  const headline =
    cur.net < 0
      ? `За период денег стало меньше на ${money(abs(cur.net), currency)}: было ${money(cur.opening, currency)}, стало ${money(cur.closing, currency)}.`
      : `Денег за период не стало меньше: они выросли на ${money(cur.net, currency)} — с ${money(cur.opening, currency)} до ${money(cur.closing, currency)}.`;

  const prevByArticle = new Map(prev.articles.map((a) => [`${a.side}:${a.articleId}`, a.amount]));
  const outflowGrowth = cur.articles
    .filter((a) => a.side === 'outflow')
    .map((a) => ({ ...a, before: prevByArticle.get(`outflow:${a.articleId}`) ?? 0 }))
    .map((a) => ({ ...a, delta: round2(a.amount - a.before) }))
    .filter((a) => a.delta > EPS)
    .sort((x, y) => y.delta - x.delta)
    .slice(0, 5);

  const figures: Figure[] = [
    { key: 'net', label: 'Изменение денег за период', value: round2(cur.net), kind: 'money', link: registryLink(period) },
    { key: 'opening', label: 'Деньги на начало', value: round2(cur.opening), kind: 'money' },
    { key: 'closing', label: 'Деньги на конец', value: round2(cur.closing), kind: 'money' },
    { key: 'inflow', label: 'Поступления', value: round2(cur.inflow), kind: 'money' },
    { key: 'outflow', label: 'Выплаты', value: round2(cur.outflow), kind: 'money' },
  ];
  const reasons: Reason[] = [];
  outflowGrowth.forEach((a, i) => {
    const key = `outflow_${a.articleId}`;
    figures.push({
      key,
      label: `Выплаты по статье «${a.name}»`,
      value: round2(a.amount),
      kind: 'money',
      drill: { articleId: a.articleId, fromDate: period.fromDate, toDate: period.toDate, basis: 'cash', title: a.name },
    });
    if (i < 3) {
      reasons.push({
        text: `Выплаты по статье «${a.name}» выросли на ${money(a.delta, currency)}: ${money(a.before, currency)} → ${money(a.amount, currency)}.`,
        figureKey: key,
      });
    }
  });
  const inflowDrop = round2(prev.inflow - cur.inflow);
  if (inflowDrop > EPS && reasons.length < 3) {
    reasons.push({
      text: `Поступлений стало меньше на ${money(inflowDrop, currency)}: ${money(prev.inflow, currency)} → ${money(cur.inflow, currency)}.`,
      figureKey: 'inflow',
    });
  }
  if (abs(cur.unclassified) > EPS) {
    figures.push({ key: 'unclassified', label: 'Движение без статьи', value: round2(cur.unclassified), kind: 'money', link: registryLink(period) });
    reasons.push({
      text: `${money(cur.unclassified, currency)} прошло без статьи — разнесите эти операции, и причины станут точнее.`,
      figureKey: 'unclassified',
    });
  }
  if (reasons.length === 0) {
    reasons.push({ text: 'По сравнению с прошлым периодом ни одна статья выплат не выросла.' });
  }
  return {
    intent: 'cash_decrease',
    period,
    base,
    empty: false,
    headline,
    figures,
    reasons,
    actions: [],
    links: [
      { label: 'Отчёт «Деньги по статьям»', href: `/financial-reports/cash-flow-articles?from_date=${period.fromDate}&to_date=${period.toDate}` },
      { label: 'Реестр операций за период', href: registryLink(period) },
    ],
  };
}

// ---------- управленческий ОПиУ ----------

const pnlTotal = (report: any) => report?.data?.total ?? {};
const tier = (report: any, key: string) => Number(pnlTotal(report)?.tiers?.[key]) || 0;
const pnlAmounts = (report: any): Record<string, number> => pnlTotal(report)?.amounts ?? {};
const pnlEmpty = (report: any) =>
  Object.values(pnlAmounts(report)).every((v) => abs(Number(v) || 0) < EPS) && abs(Number(pnlTotal(report)?.unassigned) || 0) < EPS;

export const PL_TYPE_LABELS: Record<string, string> = {
  revenue: 'Выручка',
  direct_variable: 'Прямые переменные расходы',
  direct_production: 'Прямые производственные расходы',
  overhead_production: 'Общепроизводственные расходы',
  administrative: 'Административные расходы',
  commercial: 'Коммерческие расходы',
  other_income_below_ebitda: 'Прочие доходы',
  below_ebitda: 'Налоги, амортизация, проценты',
  below_net_profit: 'Ниже чистой прибыли',
};
const EBITDA_PARTS = ['revenue', 'direct_variable', 'direct_production', 'overhead_production', 'administrative', 'commercial'];

/** «Почему EBITDA снизилась?» — разложение изменения операционной прибыли по ярусам. */
export function ebitdaDrop(current: any, previous: any, period: Period, base: Period, currency: string): AiCfoAnswer {
  if (pnlEmpty(current)) return emptyAnswer('ebitda_drop', period, base);
  const now = tier(current, 'op');
  const before = tier(previous, 'op');
  const delta = round2(now - before);
  const cur = pnlAmounts(current);
  const prev = pnlAmounts(previous);
  const factors = EBITDA_PARTS.map((key) => {
    const change = round2((Number(cur[key]) || 0) - (Number(prev[key]) || 0));
    // Рост выручки прибавляет прибыль, рост расходов — отнимает.
    const effect = key === 'revenue' ? change : -change;
    return { key, change, effect, now: Number(cur[key]) || 0, before: Number(prev[key]) || 0 };
  }).filter((f) => abs(f.change) > EPS);
  factors.sort((a, b) => a.effect - b.effect);

  const figures: Figure[] = [
    { key: 'op', label: 'Операционная прибыль (EBITDA)', value: round2(now), kind: 'money', drill: undefined },
    { key: 'op_base', label: 'EBITDA базы сравнения', value: round2(before), kind: 'money' },
    { key: 'op_delta', label: 'Изменение EBITDA', value: delta, kind: 'money' },
  ];
  factors.forEach((f) =>
    figures.push({
      key: `pl_${f.key}`,
      label: PL_TYPE_LABELS[f.key],
      value: round2(f.now),
      kind: 'money',
      drill: { plType: f.key, fromDate: period.fromDate, toDate: period.toDate, basis: 'accrual', title: PL_TYPE_LABELS[f.key] },
    }),
  );
  const headline =
    abs(before) < EPS && abs(now) >= EPS
      ? `EBITDA за период ${money(now, currency)}; в базе сравнения данных нет — темп роста не определить.`
      : delta < 0
        ? `EBITDA снизилась на ${money(abs(delta), currency)}: ${money(before, currency)} → ${money(now, currency)}.`
        : `EBITDA не снизилась: ${money(before, currency)} → ${money(now, currency)} (+${money(delta, currency)}).`;
  const reasons: Reason[] = factors
    .filter((f) => f.effect < 0)
    .slice(0, 3)
    .map((f) => ({
      text:
        f.key === 'revenue'
          ? `Выручка снизилась на ${money(abs(f.change), currency)}: ${money(f.before, currency)} → ${money(f.now, currency)}.`
          : `${PL_TYPE_LABELS[f.key]} выросли на ${money(f.change, currency)}: ${money(f.before, currency)} → ${money(f.now, currency)}.`,
      figureKey: `pl_${f.key}`,
    }));
  if (reasons.length === 0) reasons.push({ text: 'Ни один ярус не уменьшил операционную прибыль по сравнению с базой.' });
  return {
    intent: 'ebitda_drop',
    period,
    base,
    empty: false,
    headline,
    figures,
    reasons,
    table: {
      columns: ['Ярус', 'База', 'Период', 'Изменение', 'Влияние на EBITDA'],
      rows: factors.map((f) => [PL_TYPE_LABELS[f.key], round2(f.before), round2(f.now), f.change, round2(f.effect)]),
    },
    actions: [],
    links: [{ label: 'Управленческий ОПиУ', href: `/financial-reports/profit-loss-sheet?view=managerial&from_date=${period.fromDate}&to_date=${period.toDate}` }],
  };
}

// ---------- свёртка статей (расходы) ----------

export interface PlArticle {
  id: number;
  name: string;
  kind: string;
  amount: number;
}
/**
 * Статьи-листья свёртки. Родитель в свёртке — сумма детей: оставь его, и
 * «Доходы» с «Выручкой» считались бы дважды, а ответ называл бы общую статью
 * вместо конкретной (живая проверка этапа 41).
 */
const plArticles = (rollup: any): PlArticle[] => {
  const rows: any[] = Array.isArray(rollup) ? rollup : rollup?.data ?? [];
  const parents = new Set(rows.map((r) => r.parent_id ?? r.parentId).filter((v) => v !== null && v !== undefined).map(Number));
  return rows
    .filter((r) => !parents.has(Number(r.id)))
    .map((r) => ({ id: Number(r.id), name: r.name, kind: r.kind, amount: Number(r.amount) || 0 }));
};

/** «Какие расходы выросли сильнее всего?» */
export function expenseGrowth(current: any, previous: any, period: Period, base: Period, currency: string): AiCfoAnswer {
  const cur = plArticles(current).filter((a) => a.kind === 'expense');
  const prev = new Map(plArticles(previous).map((a) => [a.id, a.amount]));
  if (cur.every((a) => abs(a.amount) < EPS)) {
    // Операции за период могут быть — нет именно расходов. «Операций нет»
    // здесь было бы неправдой.
    return {
      ...emptyAnswer('expense_growth', period, base),
      headline: `Расходов за период ${period.fromDate} — ${period.toDate} нет — расти нечему.`,
      links: [{ label: 'Анализ расходов', href: `/expenses-analysis?from_date=${period.fromDate}&to_date=${period.toDate}` }],
    };
  }
  const rows = cur
    .map((a) => ({ ...a, before: prev.get(a.id) ?? 0 }))
    .map((a) => ({ ...a, delta: round2(a.amount - a.before), growth: growthPercent(a.amount, a.before) }))
    .filter((a) => a.delta > EPS)
    .sort((x, y) => y.delta - x.delta);
  const top = rows[0];
  const headline = top
    ? `Сильнее всего выросли расходы по статье «${top.name}»: +${money(top.delta, currency)}${
        top.growth === null ? ' (в базе сравнения их не было — рост в процентах не определить)' : ` (${top.growth} %)`
      }.`
    : 'Ни одна статья расходов не выросла по сравнению с базой сравнения.';
  return {
    intent: 'expense_growth',
    period,
    base,
    empty: false,
    headline,
    figures: rows.slice(0, 5).map((a) => ({
      key: `expense_${a.id}`,
      label: a.name,
      value: round2(a.amount),
      kind: 'money' as const,
      drill: { articleId: a.id, fromDate: period.fromDate, toDate: period.toDate, basis: 'accrual' as const, title: a.name },
    })),
    reasons: rows.slice(0, 3).map((a) => ({
      text: `«${a.name}»: ${money(a.before, currency)} → ${money(a.amount, currency)}, +${money(a.delta, currency)}${a.growth === null ? ', нет базы' : `, ${a.growth} %`}.`,
      figureKey: `expense_${a.id}`,
    })),
    table: {
      columns: ['Статья', 'Было', 'Стало', 'Δ', 'Δ %'],
      rows: rows.map((a) => [a.name, round2(a.before), round2(a.amount), a.delta, a.growth]),
    },
    actions: [],
    links: [{ label: 'Анализ расходов', href: `/expenses-analysis?from_date=${period.fromDate}&to_date=${period.toDate}` }],
  };
}

/** «Что изменилось относительно прошлого месяца?» — топ-5 изменений статей. */
export function periodDiff(current: any, previous: any, cashNow: any, cashBefore: any, period: Period, base: Period, currency: string): AiCfoAnswer {
  const cur = plArticles(current);
  const prev = new Map(plArticles(previous).map((a) => [a.id, a]));
  const now = cashTotals(cashNow);
  const before = cashTotals(cashBefore);
  if (cur.every((a) => abs(a.amount) < EPS) && cashEmpty(now)) return emptyAnswer('period_diff', period, base);
  const changes = cur
    .map((a) => ({ ...a, before: prev.get(a.id)?.amount ?? 0 }))
    .map((a) => ({ ...a, delta: round2(a.amount - a.before), growth: growthPercent(a.amount, a.before) }))
    .filter((a) => abs(a.delta) > EPS)
    .sort((x, y) => abs(y.delta) - abs(x.delta))
    .slice(0, 5);
  const figures: Figure[] = [
    { key: 'net', label: 'Изменение денег за период', value: round2(now.net), kind: 'money', link: registryLink(period) },
    { key: 'net_base', label: 'Изменение денег в базе сравнения', value: round2(before.net), kind: 'money' },
    ...changes.map((a) => ({
      key: `article_${a.id}`,
      label: a.name,
      value: round2(a.amount),
      kind: 'money' as const,
      drill: { articleId: a.id, fromDate: period.fromDate, toDate: period.toDate, basis: 'accrual' as const, title: a.name },
    })),
  ];
  return {
    intent: 'period_diff',
    period,
    base,
    empty: false,
    headline: changes.length
      ? `Больше всего изменилась статья «${changes[0].name}»: ${money(changes[0].before, currency)} → ${money(changes[0].amount, currency)}.`
      : 'По статьям доходов и расходов изменений нет.',
    figures,
    reasons: changes.map((a) => ({
      text: `«${a.name}»: ${money(a.before, currency)} → ${money(a.amount, currency)} (${a.delta > 0 ? '+' : '−'}${money(abs(a.delta), currency)}${
        a.growth === null ? ', нет базы' : `, ${a.growth} %`
      }).`,
      figureKey: `article_${a.id}`,
    })),
    table: {
      columns: ['Статья', 'Было', 'Стало', 'Δ', 'Δ %'],
      rows: changes.map((a) => [a.name, round2(a.before), round2(a.amount), a.delta, a.growth]),
    },
    actions: [],
    links: [{ label: 'Управленческий ОПиУ', href: `/financial-reports/profit-loss-sheet?view=managerial&from_date=${period.fromDate}&to_date=${period.toDate}` }],
  };
}

// ---------- прибыль против денег ----------

/** «Почему прибыль выросла, а денег нет?» — разложение разницы по факторам. */
export function pnlVsCash(
  pnl: any,
  cash: any,
  receivable: { start: number; end: number },
  payable: { start: number; end: number },
  period: Period,
  base: Period,
  currency: string,
): AiCfoAnswer {
  const t = cashTotals(cash);
  if (pnlEmpty(pnl) && cashEmpty(t)) return emptyAnswer('pnl_vs_cash', period, base);
  const profit = round2(tier(pnl, 'np'));
  const net = round2(t.net);
  const gap = round2(profit - net);
  const arChange = round2(receivable.end - receivable.start);
  const apChange = round2(payable.end - payable.start);
  // Рост дебиторки: прибыль признана, а деньги ещё у покупателей. Рост
  // кредиторки — наоборот, деньги пока у нас.
  const other = round2(gap - arChange + apChange);
  const figures: Figure[] = [
    { key: 'profit', label: 'Чистая прибыль за период', value: profit, kind: 'money' },
    { key: 'net', label: 'Изменение денег за период', value: net, kind: 'money', link: registryLink(period) },
    { key: 'gap', label: 'Разница между прибылью и деньгами', value: gap, kind: 'money' },
    { key: 'receivable_change', label: 'Рост долгов покупателей', value: arChange, kind: 'money', link: '/debts' },
    { key: 'payable_change', label: 'Рост наших долгов поставщикам', value: apChange, kind: 'money', link: '/debts' },
    { key: 'other', label: 'Прочее: кредиты, собственник, покупка активов', value: other, kind: 'money' },
  ];
  const reasons: Reason[] = [];
  if (arChange > EPS) reasons.push({ text: `Покупатели должны на ${money(arChange, currency)} больше, чем в начале периода: прибыль признана, деньги ещё не пришли.`, figureKey: 'receivable_change' });
  if (apChange < -EPS) reasons.push({ text: `Долги поставщикам сократились на ${money(abs(apChange), currency)}: деньги ушли на расчёты за прошлое.`, figureKey: 'payable_change' });
  if (abs(other) > EPS) reasons.push({ text: `${money(abs(other), currency)} — движения вне прибыли: кредиты, взносы и изъятия собственника, покупка активов.`, figureKey: 'other' });
  return {
    intent: 'pnl_vs_cash',
    period,
    base,
    empty: false,
    headline: `Прибыль за период ${money(profit, currency)}, а денег прибавилось ${money(net, currency)}: разница ${money(gap, currency)}.`,
    figures,
    reasons: reasons.length ? reasons : [{ text: 'Прибыль и деньги за период совпадают — объяснять нечего.' }],
    table: {
      columns: ['Фактор', 'Сумма'],
      rows: [
        ['Чистая прибыль', profit],
        ['− рост долгов покупателей', arChange],
        ['+ рост долгов поставщикам', apChange],
        ['± прочее', other],
        ['= изменение денег', net],
      ],
    },
    actions: [],
    links: [
      { label: 'Отчёт «Деньги по статьям»', href: `/financial-reports/cash-flow-articles?from_date=${period.fromDate}&to_date=${period.toDate}` },
      { label: 'Долги', href: '/debts' },
    ],
  };
}

// ---------- разрывы, перенос, долги ----------

export function cashGap(gaps: any, scenarios: any, period: Period, currency: string): AiCfoAnswer {
  const accounts: any[] = gaps?.accounts ?? [];
  const found = accounts
    .flatMap((a) => (a.gaps ?? []).map((g: any) => ({ ...g, accountId: a.account_id, accountName: a.account_name })))
    .sort((x, y) => String(x.from).localeCompare(String(y.from)));
  const first = found[0];
  const actions = rescheduleActions(scenarios);
  if (!first) {
    return {
      intent: 'cash_gap',
      period,
      base: null,
      empty: false,
      headline: `В прогнозе на ${gaps?.horizon_days ?? 90} дней кассового разрыва нет: остаток ни на одном счёте не уходит в минус.`,
      figures: [],
      reasons: [],
      actions: [],
      links: [{ label: 'Платёжный календарь', href: '/payment-calendar' }],
    };
  }
  return {
    intent: 'cash_gap',
    period,
    base: null,
    empty: false,
    headline: `Кассовый разрыв возможен ${first.from} на счёте «${first.accountName}»: остаток уйдёт в минус до ${money(Number(first.deepest_amount), currency)} (${first.deepest_date}).`,
    figures: [
      { key: 'gap_date', label: 'Дата разрыва', value: null, kind: 'date', date: first.from },
      { key: 'gap_depth', label: 'Глубина разрыва', value: round2(Number(first.deepest_amount)), kind: 'money', link: '/payment-calendar' },
    ],
    reasons: found.slice(1, 4).map((g) => ({ text: `Ещё один разрыв: ${g.from}, счёт «${g.accountName}», до ${money(Number(g.deepest_amount), currency)}.` })),
    actions,
    links: [{ label: 'Платёжный календарь', href: '/payment-calendar' }],
  };
}

export function rescheduleActions(scenarios: any): AiCfoAction[] {
  return ((scenarios?.candidates ?? []) as any[])
    .filter((c) => c.suggested_date && c.planned_operation_id)
    .slice(0, 5)
    .map((c) => ({
      kind: 'reschedule_planned_operation' as const,
      label: `Перенести «${c.label}» с ${c.date} на ${c.suggested_date}`,
      plannedOperationId: Number(c.planned_operation_id),
      amount: Number(c.amount) || 0,
      fromDate: c.date,
      toDate: c.suggested_date,
      preview: {
        method: 'POST' as const,
        path: '/payment-calendar/what-if',
        body: { moves: [{ plannedOperationId: Number(c.planned_operation_id), date: c.suggested_date }] },
      },
      execute: {
        method: 'POST' as const,
        path: `/payment-calendar/planned-operations/${Number(c.planned_operation_id)}/reschedule`,
        body: { plannedDate: c.suggested_date },
      },
      requiresConfirmation: true as const,
    }));
}

export function reschedule(scenarios: any, period: Period, currency: string): AiCfoAnswer {
  const actions = rescheduleActions(scenarios);
  const gap = Number(scenarios?.gap) || 0;
  return {
    intent: 'reschedule',
    period,
    base: null,
    empty: false,
    headline: !scenarios?.gap_date
      ? 'Разрыва в прогнозе нет — переносить платежи не нужно.'
      : actions.length
        ? `Разрыв ${scenarios.gap_date} глубиной ${money(abs(gap), currency)}. Можно перенести ${actions.length} платеж(а) — каждый проверьте перед сохранением.`
        : `Разрыв ${scenarios.gap_date} глубиной ${money(abs(gap), currency)}, но разовых платежей до него, которые можно сдвинуть, нет.`,
    figures: scenarios?.gap_date
      ? [
          { key: 'gap_date', label: 'Дата разрыва', value: null, kind: 'date', date: scenarios.gap_date },
          { key: 'gap_depth', label: 'Глубина разрыва', value: round2(abs(gap)), kind: 'money', link: '/payment-calendar' },
        ]
      : [],
    reasons: actions.map((a) => ({ text: `${a.label}: ${money(a.amount, currency)}.` })),
    actions,
    links: [{ label: 'Платёжный календарь', href: '/payment-calendar' }],
  };
}

/**
 * «Какие клиенты задерживают оплату?» Имена клиентов — только человеку:
 * модели уходят суммы без имён (правило ТЗ-1 §13.1 о персональных данных).
 */
export function overdueReceivables(debts: any, period: Period, currency: string): AiCfoAnswer {
  const receivable = debts?.receivable ?? {};
  const contacts: any[] = (receivable.contacts ?? [])
    .filter((c: any) => (Number(c.overdue_total) || 0) > EPS)
    .sort((a: any, b: any) => (Number(b.overdue_total) || 0) - (Number(a.overdue_total) || 0));
  const overdue = round2(Number(receivable.overdue_total) || 0);
  if (!contacts.length) {
    return {
      intent: 'overdue_receivables',
      period,
      base: null,
      empty: false,
      headline: 'Просроченных долгов покупателей нет.',
      figures: [{ key: 'overdue', label: 'Просрочено', value: 0, kind: 'money', link: '/debts' }],
      reasons: [],
      actions: [],
      links: [{ label: 'Долги', href: '/debts' }],
    };
  }
  return {
    intent: 'overdue_receivables',
    period,
    base: null,
    empty: false,
    headline: `Покупатели просрочили ${money(overdue, currency)}; больше всех — ${contacts[0].contact_name}: ${money(Number(contacts[0].overdue_total), currency)}.`,
    figures: [
      { key: 'overdue', label: 'Просрочено всего', value: overdue, kind: 'money', link: '/debts' },
      { key: 'receivable', label: 'Долг покупателей всего', value: round2(Number(receivable.total) || 0), kind: 'money', link: '/debts' },
    ],
    reasons: contacts.slice(0, 5).map((c) => ({
      text: `${c.contact_name}: просрочено ${money(Number(c.overdue_total), currency)} из ${money(Number(c.total), currency)}.`,
    })),
    table: {
      columns: ['Покупатель', 'Просрочено', 'Всего долг'],
      rows: contacts.map((c) => [c.contact_name, round2(Number(c.overdue_total)), round2(Number(c.total))]),
    },
    actions: [],
    links: [{ label: 'Долги', href: '/debts' }],
  };
}
