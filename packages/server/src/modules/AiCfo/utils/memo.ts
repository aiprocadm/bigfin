// © 2026 Bigfin
import * as moment from 'moment';
import { cashArticles, money, Period } from './evidence';

/**
 * Аналитическая записка (FT-100 ТЗ-3): Обзор · Денежные потоки · Прибыль ·
 * Долги · Риски · Сильные стороны · Рекомендации.
 *
 * Каждый раздел — числа из тех же отчётов, что на экранах, и график из тех
 * же чисел. Текст собирается по правилам, а не пишется моделью: записку
 * отдают бухгалтеру и банку, и в ней не может быть выдуманной цифры.
 */
export interface MemoFigure {
  label: string;
  value: number | null;
}

export interface MemoSection {
  key: 'overview' | 'cash' | 'profit' | 'debts' | 'risks' | 'strengths' | 'recommendations';
  title: string;
  text: string[];
  figures: MemoFigure[];
  /** Столбики для графика раздела — из этих же чисел. */
  chart?: Array<{ label: string; value: number }>;
}

export interface BusinessContext {
  industry: string | null;
  stage: 'start' | 'growth' | 'mature' | null;
  size: 'micro' | 'small' | 'medium' | null;
  salesModel: 'b2b' | 'b2c' | 'mixed' | null;
  note: string | null;
}

export interface Memo {
  period: Period;
  context: BusinessContext;
  sections: MemoSection[];
  calculatedAt: string;
}

export interface MemoInput {
  period: Period;
  context: BusinessContext;
  cash: any;
  pnl: any;
  debts: any;
  gaps: any;
  currency?: string;
}

const n = (value: unknown) => Number(value) || 0;
const pct = (value: number | null | undefined) => (value === null || value === undefined ? 'н/о' : `${Math.round(value * 10) / 10} %`);

export function buildMemo(input: MemoInput, now = moment()): Memo {
  const c = input.currency ?? 'RUB';
  const cash = input.cash?.data ?? {};
  const total = input.pnl?.data?.total ?? {};
  const tiers = total.tiers ?? {};
  const amounts = total.amounts ?? {};
  const margins = tiers.margins ?? {};
  const receivable = input.debts?.receivable ?? {};
  const payable = input.debts?.payable ?? {};
  const gaps = ((input.gaps?.accounts ?? []) as any[]).flatMap((a) => (a.gaps ?? []).map((g: any) => ({ ...g, account: a.account_name })));
  const firstGap = gaps.sort((a, b) => String(a.from).localeCompare(String(b.from)))[0];

  const revenue = n(amounts.revenue);
  const np = n(tiers.np);
  const op = n(tiers.op);
  const net = n(cash.net_cash_flow);
  const outflows = cashArticles(input.cash)
    .filter((a) => a.side === 'outflow' && a.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const marginOf = (key: string) => (margins[key]?.applicable ? n(margins[key]?.value) : null);
  const overdueShare = n(receivable.total) > 0 ? (n(receivable.overdue_total) / n(receivable.total)) * 100 : null;

  const risks: string[] = [];
  if (firstGap) risks.push(`Кассовый разрыв ${firstGap.from} на счёте «${firstGap.account}» глубиной до ${money(n(firstGap.deepest_amount), c)}.`);
  if (np < 0) risks.push(`Чистый убыток за период: ${money(np, c)}.`);
  if (net < 0) risks.push(`Денег за период стало меньше на ${money(Math.abs(net), c)}.`);
  if (overdueShare !== null && overdueShare >= 30) risks.push(`Просрочено ${pct(overdueShare)} долгов покупателей — ${money(n(receivable.overdue_total), c)}.`);
  if (n(cash.unclassified) !== 0) risks.push(`${money(n(cash.unclassified), c)} движения денег без статьи — выводы по статьям неполные.`);

  const strengths: string[] = [];
  if (np > 0) strengths.push(`Бизнес прибылен: чистая прибыль ${money(np, c)}, рентабельность ${pct(marginOf('np'))}.`);
  if (net > 0) strengths.push(`Денег прибавилось на ${money(net, c)}.`);
  if (!firstGap) strengths.push('В прогнозе нет кассовых разрывов.');
  if (overdueShare !== null && overdueShare < 10) strengths.push(`Покупатели платят вовремя: просрочено лишь ${pct(overdueShare)}.`);

  const recommendations: string[] = [];
  if (firstGap) recommendations.push('Откройте платёжный календарь и перенесите разовые платежи до разрыва — AI CFO подскажет, какие.');
  if (overdueShare !== null && overdueShare >= 10) recommendations.push('Свяжитесь с должниками из раздела «Долги»: просрочка — это ваши деньги у покупателей.');
  if (n(cash.unclassified) !== 0) recommendations.push('Разнесите операции без статьи — так отчёты и записка станут точнее.');
  if (np < 0 && revenue > 0) recommendations.push('Сравните расходы с прошлым периодом: спросите AI CFO «Какие расходы выросли сильнее всего?».');
  if (!recommendations.length) recommendations.push('Серьёзных проблем не видно. Держите тот же порядок: разносите операции и планируйте платежи.');

  const sections: MemoSection[] = [
    {
      key: 'overview',
      title: 'Обзор',
      text: [
        `Период ${input.period.fromDate} — ${input.period.toDate}.`,
        `Выручка ${money(revenue, c)}, чистая прибыль ${money(np, c)}, денег на конец периода ${money(n(cash.closing_balance), c)}.`,
      ],
      figures: [
        { label: 'Выручка', value: revenue },
        { label: 'Чистая прибыль', value: np },
        { label: 'Деньги на конец', value: n(cash.closing_balance) },
      ],
    },
    {
      key: 'cash',
      title: 'Денежные потоки',
      text: [
        `Деньги: ${money(n(cash.opening_balance), c)} на начало, ${money(n(cash.closing_balance), c)} на конец; изменение ${money(net, c)}.`,
        ...(outflows.length ? [`Крупнейшие выплаты: ${outflows.map((a) => `«${a.name}» ${money(a.amount, c)}`).join(', ')}.`] : []),
      ],
      figures: [
        { label: 'На начало', value: n(cash.opening_balance) },
        { label: 'На конец', value: n(cash.closing_balance) },
        { label: 'Изменение', value: net },
      ],
      chart: outflows.map((a) => ({ label: a.name, value: a.amount })),
    },
    {
      key: 'profit',
      title: 'Прибыль',
      text: [
        `Маржинальный доход ${money(n(tiers.md), c)} (${pct(marginOf('md'))}), операционная прибыль ${money(op, c)} (${pct(marginOf('op'))}), чистая прибыль ${money(np, c)} (${pct(marginOf('np'))}).`,
      ],
      figures: [
        { label: 'Маржинальный доход', value: n(tiers.md) },
        { label: 'Операционная прибыль', value: op },
        { label: 'Чистая прибыль', value: np },
      ],
      chart: [
        { label: 'Выручка', value: revenue },
        { label: 'МД', value: n(tiers.md) },
        { label: 'ВП1', value: n(tiers.gp1) },
        { label: 'ВП2', value: n(tiers.gp2) },
        { label: 'ОП', value: op },
        { label: 'ЧП', value: np },
      ],
    },
    {
      key: 'debts',
      title: 'Долги',
      text: [
        `Нам должны ${money(n(receivable.total), c)}, из них просрочено ${money(n(receivable.overdue_total), c)}. Мы должны ${money(n(payable.total), c)}, просрочено ${money(n(payable.overdue_total), c)}.`,
      ],
      figures: [
        { label: 'Нам должны', value: n(receivable.total) },
        { label: 'Просрочено нам', value: n(receivable.overdue_total) },
        { label: 'Мы должны', value: n(payable.total) },
      ],
      chart: [
        { label: 'Нам должны', value: n(receivable.total) },
        { label: 'Мы должны', value: n(payable.total) },
      ],
    },
    { key: 'risks', title: 'Риски', text: risks.length ? risks : ['Существенных рисков в данных не видно.'], figures: [] },
    { key: 'strengths', title: 'Сильные стороны', text: strengths.length ? strengths : ['Сильных сторон по этим данным не выделить — данных мало.'], figures: [] },
    { key: 'recommendations', title: 'Рекомендации', text: recommendations, figures: [] },
  ];
  return { period: input.period, context: input.context, sections, calculatedAt: now.format('YYYY-MM-DD HH:mm:ss') };
}

/** Текст записки целиком — для «Скопировать текст». */
export function memoText(memo: Memo): string {
  return [`Аналитическая записка за ${memo.period.fromDate} — ${memo.period.toDate}`, '', ...memo.sections.flatMap((s) => [s.title, ...s.text, ''])]
    .join('\n')
    .trim();
}

const escape = (text: string) => text.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

/** HTML для PDF: простая вёрстка, столбики — полосами, без внешних файлов. */
export function memoHtml(memo: Memo, organization: string): string {
  const bars = (chart?: Array<{ label: string; value: number }>) => {
    if (!chart?.length) return '';
    const max = Math.max(...chart.map((b) => Math.abs(b.value)), 1);
    return `<table class="bars">${chart
      .map((b) => `<tr><td>${escape(b.label)}</td><td><div class="bar${b.value < 0 ? ' neg' : ''}" style="width:${Math.round((Math.abs(b.value) / max) * 100)}%"></div></td><td class="num">${escape(money(b.value))}</td></tr>`)
      .join('')}</table>`;
  };
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:32px}
h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}
.muted{color:#666}p{margin:4px 0}.bars{width:100%;border-collapse:collapse}.bars td{padding:2px 4px}
.bars td:first-child{width:30%}.bars td.num{width:25%;text-align:right;white-space:nowrap}
.bar{height:10px;background:#4f7cff}.bar.neg{background:#e5484d}
</style></head><body>
<h1>${escape(organization)}: аналитическая записка</h1>
<p class="muted">Период ${escape(memo.period.fromDate)} — ${escape(memo.period.toDate)} · расчёт ${escape(memo.calculatedAt)} · все числа — из отчётов Bigfin</p>
${memo.sections.map((s) => `<h2>${escape(s.title)}</h2>${s.text.map((t) => `<p>${escape(t)}</p>`).join('')}${bars(s.chart)}`).join('\n')}
</body></html>`;
}
