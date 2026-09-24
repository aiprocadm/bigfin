// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';
import { classifyIntent, INTENTS } from './utils/intentClassifier';
import { REPLACEMENT, validateExplanation } from './utils/answerValidator';
import {
  AiCfoAnswer,
  cashArticles,
  cashDecrease,
  cashGap,
  ebitdaDrop,
  expenseGrowth,
  growthPercent,
  overdueReceivables,
  periodDiff,
  pnlVsCash,
  reschedule,
} from './utils/evidence';
import { AiCfoService } from './AiCfo.service';
import { assertNoPrivateData } from '@/modules/AiAnalyst/utils/aiPrivacy';

/** FT-100…FT-102 ТЗ-3: AI CFO. */
const period = { fromDate: '2026-09-01', toDate: '2026-09-24' };
const base = { fromDate: '2026-08-08', toDate: '2026-08-31' };

const cash = (opening: number, closing: number, rent: number, revenue: number, unclassified = 0) => ({
  data: {
    opening_balance: opening,
    closing_balance: closing,
    net_cash_flow: closing - opening,
    unclassified,
    rows: [
      { id: 'inflow', row_type: 'INFLOW', amount: revenue, children: [{ id: 'article-2', name: 'Выручка', row_type: 'ARTICLE', amount: revenue, children: [] }] },
      {
        id: 'outflow',
        row_type: 'OUTFLOW',
        amount: rent,
        children: [{ id: 'article-3', name: 'Расходы', row_type: 'ARTICLE', amount: rent, children: [{ id: 'article-5', name: 'Аренда', row_type: 'ARTICLE', amount: rent, children: [] }] }],
      },
    ],
  },
});
const pnl = (amounts: Record<string, number>, tiers: Record<string, number>) => ({ data: { total: { amounts, tiers, unassigned: 0 } } });
const rollup = (rows: Array<[number, string, string, number]>) => rows.map(([id, name, kind, amount]) => ({ id, name, kind, amount }));

describe('вид вопроса', () => {
  it.each(INTENTS.map((i) => [i.example, i.key]))('«%s» → %s', (question, key) => {
    expect(classifyIntent(question as string)).toBe(key);
  });

  it('узкий вид выигрывает у общего; непонятное — null', () => {
    expect(classifyIntent('Почему прибыль есть, а денег на счету нет?')).toBe('pnl_vs_cash');
    expect(classifyIntent('куда ушли деньги в этом месяце')).toBe('cash_decrease');
    expect(classifyIntent('какая завтра погода')).toBeNull();
  });
});

describe('aiCfoNumbersMatchReports: каждое число ответа — из расчёта', () => {
  it('AC 1: «почему денег стало меньше» называет изменение, равное ОДДС', () => {
    const answer = cashDecrease(cash(1000000, 700000, 500000, 200000), cash(900000, 1000000, 100000, 200000), period, base, 'RUB');
    const net = answer.figures.find((f) => f.key === 'net')!;
    expect(net.value).toBe(-300000);
    expect(answer.headline).toContain('300');
    expect(answer.reasons[0].text).toContain('Аренда');
  });

  it('текст по шаблону проходит проверку чисел целиком — ни одной замены', () => {
    const service = new AiCfoService({} as any, {} as any, {} as any);
    const answers: AiCfoAnswer[] = [
      cashDecrease(cash(1000000, 700000, 500000, 200000), cash(900000, 1000000, 100000, 200000), period, base, 'RUB'),
      ebitdaDrop(pnl({ revenue: 500000, administrative: 300000 }, { op: 200000, np: 150000 }), pnl({ revenue: 600000, administrative: 250000 }, { op: 350000 }), period, base, 'RUB'),
      expenseGrowth(rollup([[5, 'Аренда', 'expense', 120000], [6, 'ФОТ', 'expense', 400000]]), rollup([[5, 'Аренда', 'expense', 100000]]), period, base, 'RUB'),
      pnlVsCash(pnl({ revenue: 500000 }, { np: 400000 }), cash(100000, 150000, 0, 0), { start: 0, end: 300000 }, { start: 50000, end: 0 }, period, base, 'RUB'),
    ];
    for (const answer of answers) {
      const template = [answer.headline, ...answer.reasons.map((r) => r.text)].join(' ');
      const checked = validateExplanation(template, service.knownNumbers(answer));
      expect({ intent: answer.intent, rejected: checked.rejected }).toEqual({ intent: answer.intent, rejected: [] });
    }
  });

  it('AC 3: число модели не из расчёта заменяется на «см. отчёт»', () => {
    const answer = cashDecrease(cash(1000000, 700000, 500000, 200000), cash(900000, 1000000, 100000, 200000), period, base, 'RUB');
    const service = new AiCfoService({} as any, {} as any, {} as any);
    const checked = validateExplanation('Денег меньше на 300 000 ₽, аренда выросла на 1 234 567 ₽ за 3 месяца.', service.knownNumbers(answer));
    expect(checked.rejected).toEqual([1234567]);
    expect(checked.text).toContain('300 000');
    expect(checked.text).toContain(REPLACEMENT);
    expect(checked.text).toContain('3 месяца');
  });

  it('разложение «прибыль против денег» сходится до рубля', () => {
    const answer = pnlVsCash(pnl({ revenue: 500000 }, { np: 400000 }), cash(100000, 150000, 0, 0), { start: 0, end: 300000 }, { start: 50000, end: 0 }, period, base, 'RUB');
    const v = (k: string) => answer.figures.find((f) => f.key === k)!.value as number;
    expect(v('profit') - v('receivable_change') + v('payable_change') - v('other')).toBeCloseTo(v('net'), 2);
  });
});

describe('aiCfoEdgeOfData: края данных', () => {
  it('AC 5: пустой период — «операций нет», без причин и гипотез', () => {
    const empty = cashDecrease(cash(500, 500, 0, 0), cash(500, 500, 0, 0), period, base, 'RUB');
    expect(empty.empty).toBe(true);
    expect(empty.headline).toContain('операций нет');
    expect(empty.reasons).toEqual([]);
    expect(expenseGrowth(rollup([[5, 'Аренда', 'expense', 0]]), [], period, base, 'RUB').empty).toBe(true);
    expect(ebitdaDrop(pnl({}, {}), pnl({}, {}), period, base, 'RUB').empty).toBe(true);
  });

  it('первый период: рост к нулевой базе — «нет базы», а не +100 %', () => {
    expect(growthPercent(120000, 0)).toBeNull();
    const answer = expenseGrowth(rollup([[6, 'ФОТ', 'expense', 400000]]), [], period, base, 'RUB');
    expect(answer.table!.rows[0][4]).toBeNull();
    expect(answer.headline).toContain('рост в процентах не определить');
    expect(answer.headline).not.toMatch(/100\s*%/);
    const ebitda = ebitdaDrop(pnl({ revenue: 100 }, { op: 100 }), pnl({}, {}), period, base, 'RUB');
    expect(ebitda.headline).toContain('темп роста не определить');
  });

  it('отрицательная выручка и падение EBITDA раскладываются по ярусам', () => {
    const answer = ebitdaDrop(pnl({ revenue: -50000, commercial: 10000 }, { op: -60000 }), pnl({ revenue: 100000 }, { op: 100000 }), period, base, 'RUB');
    expect(answer.headline).toContain('снизилась');
    expect(answer.reasons[0].text).toContain('Выручка снизилась');
  });

  it('без статьи — отдельной строкой, а не молча', () => {
    const answer = cashDecrease(cash(100, 50, 0, 0, -50), cash(100, 100, 0, 0), period, base, 'RUB');
    expect(answer.figures.map((f) => f.key)).toContain('unclassified');
  });

  it('листья «Денег» берутся без родителей — нет двойного счёта', () => {
    const leaves = cashArticles(cash(0, 0, 500, 200));
    expect(leaves.map((a) => a.articleId).sort()).toEqual([2, 5]);
  });
});

describe('aiCfoEvidenceLinks: у каждого вывода — ссылка на операции', () => {
  const answers = () => [
    cashDecrease(cash(1000000, 700000, 500000, 200000, 10), cash(900000, 1000000, 100000, 200000), period, base, 'RUB'),
    expenseGrowth(rollup([[5, 'Аренда', 'expense', 120000]]), rollup([[5, 'Аренда', 'expense', 100000]]), period, base, 'RUB'),
    periodDiff(rollup([[5, 'Аренда', 'expense', 120000]]), rollup([[5, 'Аренда', 'expense', 100000]]), cash(0, 10, 0, 10), cash(0, 0, 0, 0), period, base, 'RUB'),
    ebitdaDrop(pnl({ revenue: 500000, administrative: 300000 }, { op: 200000 }), pnl({ revenue: 600000 }, { op: 600000 }), period, base, 'RUB'),
  ];

  it('каждая причина ссылается на число, у которого есть «Показать операции»', () => {
    for (const answer of answers()) {
      for (const reason of answer.reasons.filter((r) => r.figureKey)) {
        const figure = answer.figures.find((f) => f.key === reason.figureKey);
        expect({ intent: answer.intent, reason: reason.text, ok: Boolean(figure && (figure.drill || figure.link)) }).toMatchObject({ ok: true });
      }
      expect(answer.links.length).toBeGreaterThan(0);
    }
  });

  it('AC 2: раскрытие статьи — за тот же период и тем же методом, что число', () => {
    const answer = answers()[0];
    const rent = answer.figures.find((f) => f.key === 'outflow_5')!;
    expect(rent.drill).toMatchObject({ articleId: 5, fromDate: period.fromDate, toDate: period.toDate, basis: 'cash' });
    expect(rent.value).toBe(500000);
  });
});

describe('aiCfoNoWriteTools: AI ничего не меняет', () => {
  const dir = __dirname;
  const sources = fs
    .readdirSync(dir, { recursive: true } as any)
    .map(String)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map((f) => ({ f, code: activeCode(fs.readFileSync(path.join(dir, f), 'utf8')) }));

  it('данные — только GET к отчётам', () => {
    const methods = sources.flatMap(({ code }) => [...code.matchAll(/method:\s*'(\w+)'/g)].map((m) => m[1]));
    expect([...new Set(methods)].filter((m) => m !== 'GET' && m !== 'POST')).toEqual([]);
    const client = sources.find((s) => s.f.endsWith('AiCfoData.client.ts'))!.code;
    expect([...client.matchAll(/method:\s*'(\w+)'/g)].map((m) => m[1])).toEqual(['GET']);
  });

  it('в модуле нет записи в базу и нет вызова изменяющих служб', () => {
    for (const { f, code } of sources) {
      expect({ f, hits: code.match(/\.(insert|patch|update|delete|upsertGraph|relate)\(/g) }).toEqual({ f, hits: null });
    }
  });

  it('AC 4: действие — только описание кнопки с предпросмотром и подтверждением', () => {
    const scenarios = { gap: -100000, gap_date: '2026-10-10', candidates: [{ planned_operation_id: 7, date: '2026-10-05', amount: 700000, label: 'Аренда', suggested_date: '2026-10-25' }] };
    const [action] = reschedule(scenarios, period, 'RUB').actions;
    expect(action).toMatchObject({
      requiresConfirmation: true,
      preview: { path: '/payment-calendar/what-if' },
      execute: { path: '/payment-calendar/planned-operations/7/reschedule', body: { plannedDate: '2026-10-25' } },
    });
    expect(cashGap({ accounts: [] }, scenarios, period, 'RUB').headline).toContain('разрыва нет');
  });

  it('модели не уходят имена покупателей', () => {
    const answer = overdueReceivables(
      { receivable: { total: 100, overdue_total: 90, contacts: [{ contact_name: 'ООО «Ромашка»', overdue_total: 90, total: 100 }] } },
      period,
      'RUB',
    );
    expect(answer.headline).toContain('Ромашка'); // человеку — видно
    const rows = answer.figures.map((f, i) => ({ label: `Показатель ${i + 1}`, amount: f.value as number }));
    expect(() => assertNoPrivateData({ rows })).not.toThrow();
    expect(JSON.stringify(rows)).not.toContain('Ромашка');
  });
});

describe('даты в пояснении — не суммы', () => {
  it('двадцать дат подряд не дают ни одной замены, чужая сумма — даёт', () => {
    const dates = Array.from({ length: 20 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`).join(', ');
    const checked = validateExplanation(`Разрывы: ${dates}; и ещё 01.11.2026. Сумма 999 999 ₽.`, { amounts: [5] });
    expect(checked.rejected).toEqual([999999]);
    expect(checked.text).toContain('2026-10-20');
    expect(checked.text).toContain('01.11.2026');
  });
});
