// © 2026 Bigfin
import * as moment from 'moment';
import { buildMemo, memoHtml, memoText } from './utils/memo';
import { inferContext, mergeContext } from './utils/businessContext';
import { validateExplanation } from './utils/answerValidator';

/** FT-100 и FT-101 ТЗ-3: аналитическая записка и контекст бизнеса. */
const context = { industry: 'Услуги', stage: 'growth' as const, size: 'micro' as const, salesModel: 'b2b' as const, note: null };
const input = {
  period: { fromDate: '2026-08-01', toDate: '2026-08-31' },
  context,
  cash: {
    data: {
      opening_balance: 760000,
      closing_balance: 1860000,
      net_cash_flow: 1100000,
      unclassified: 0,
      rows: [{ id: 'outflow', row_type: 'OUTFLOW', children: [{ id: 'article-5', name: 'Аренда', row_type: 'ARTICLE', amount: 90000, children: [] }] }],
    },
  },
  pnl: {
    data: {
      total: {
        amounts: { revenue: 600000 },
        tiers: { md: 500000, gp1: 450000, gp2: 400000, op: 300000, np: 250000, margins: { md: { value: 83.3, applicable: true }, op: { value: 50, applicable: true }, np: { value: 41.7, applicable: true } } },
      },
    },
  },
  debts: { receivable: { total: 1200000, overdue_total: 1140000 }, payable: { total: 106000, overdue_total: 0 } },
  gaps: { accounts: [{ account_name: 'Расчётный счёт', gaps: [{ from: '2026-10-10', deepest_amount: -200000 }] }] },
};

describe('аналитическая записка (FT-100)', () => {
  const memo = buildMemo(input, moment('2026-09-24 10:00:00'));

  it('семь разделов в порядке ТЗ', () => {
    expect(memo.sections.map((s) => s.title)).toEqual(['Обзор', 'Денежные потоки', 'Прибыль', 'Долги', 'Риски', 'Сильные стороны', 'Рекомендации']);
  });

  it('каждое число текста — из отчётов (проверка тем же сверщиком, что у ответов модели)', () => {
    const known = {
      cash: input.cash.data,
      tiers: input.pnl.data.total,
      debts: input.debts,
      gaps: input.gaps,
      shares: [(1140000 / 1200000) * 100],
      rent: 90000,
    };
    const checked = validateExplanation(memoText(memo), known);
    expect(checked.rejected).toEqual([]);
  });

  it('графики — из тех же чисел, что текст', () => {
    const profit = memo.sections.find((s) => s.key === 'profit')!;
    expect(profit.chart!.map((b) => b.value)).toEqual([600000, 500000, 450000, 400000, 300000, 250000]);
    expect(memo.sections.find((s) => s.key === 'cash')!.chart).toEqual([{ label: 'Аренда', value: 90000 }]);
  });

  it('риски и рекомендации следуют из данных: разрыв и просрочка названы', () => {
    const risks = memo.sections.find((s) => s.key === 'risks')!.text.join(' ');
    expect(risks).toContain('2026-10-10');
    expect(risks).toContain('Просрочено');
    const recs = memo.sections.find((s) => s.key === 'recommendations')!.text.join(' ');
    expect(recs).toContain('платёжный календарь');
  });

  it('нулевая выручка — рентабельность «н/о», не «0 %»', () => {
    const empty = buildMemo({ ...input, pnl: { data: { total: { amounts: {}, tiers: { margins: { np: { value: null, applicable: false } } } } } } });
    expect(empty.sections.find((s) => s.key === 'profit')!.text.join(' ')).toContain('н/о');
  });

  it('PDF: HTML без внешних файлов, текст экранирован', () => {
    const html = memoHtml(memo, 'ООО <Тест>');
    expect(html).toContain('ООО &lt;Тест&gt;');
    expect(html).not.toMatch(/<script|src=|href=/);
  });
});

describe('контекст бизнеса (FT-101)', () => {
  const today = moment('2026-09-24');

  it('значения по умолчанию выводятся из данных', () => {
    expect(inferContext({ industry: 'Услуги', firstOperationDate: '2026-01-15', yearRevenue: 5_000_000, employees: 3, invoices: 10, receipts: 0 }, today)).toEqual({
      industry: 'Услуги',
      stage: 'start',
      size: 'micro',
      salesModel: 'b2b',
      note: null,
    });
    expect(inferContext({ industry: null, firstOperationDate: '2022-01-01', yearRevenue: 300_000_000, employees: 40, invoices: 5, receipts: 7 }, today)).toMatchObject({
      stage: 'mature',
      size: 'small',
      salesModel: 'mixed',
    });
    expect(inferContext({ industry: null, firstOperationDate: null, yearRevenue: 0, employees: 0, invoices: 0, receipts: 0 }, today)).toMatchObject({
      stage: null,
      salesModel: null,
    });
  });

  it('выбор человека важнее вывода; пустое не затирает вывод', () => {
    const inferred = inferContext({ industry: 'Услуги', firstOperationDate: '2026-01-15', yearRevenue: 0, employees: 0, invoices: 1, receipts: 0 }, today);
    expect(mergeContext(inferred, { stage: 'mature', industry: '' })).toMatchObject({ stage: 'mature', industry: 'Услуги', salesModel: 'b2b' });
  });
});
