// © 2026 Bigfin
import {
  ArticlesCashflowRollupService,
  legDate,
  periodIndexOf,
} from './ArticlesCashflowRollup.service';

/**
 * Кассовая свёртка по периодам за один проход (FT-001 ТЗ-3).
 *
 * Главное свойство: сумма колонок равна свёртке за весь отрезок при любом
 * масштабе. Колонки, которые не складываются в итог, — хуже, чем отсутствие
 * колонок: человек сложит их на калькуляторе и перестанет верить отчёту.
 */
const JANUARY = { fromDate: '2026-01-01', toDate: '2026-01-31' };
const FEBRUARY = { fromDate: '2026-02-01', toDate: '2026-02-28' };
const MARCH = { fromDate: '2026-03-01', toDate: '2026-03-31' };

/** Касса 100 — денежный счёт; 500 — расход «Аренда», 600 — доход «Выручка». */
const leg = (
  referenceId: number,
  date: string,
  accountId: number,
  debit: number,
  credit: number,
) => ({
  referenceType: 'CashflowTransaction',
  referenceId,
  accountId,
  debit,
  credit,
  // База отдаёт дату объектом — проверяем именно это.
  date: new Date(`${date}T00:00:00`),
});

const LEGS = [
  // Январь: аренда 150 000 деньгами.
  leg(1, '2026-01-10', 100, 0, 150000),
  leg(1, '2026-01-10', 500, 150000, 0),
  // Февраль: выручка 400 000 деньгами.
  leg(2, '2026-02-05', 100, 400000, 0),
  leg(2, '2026-02-05', 600, 0, 400000),
  // Март: аренда 90 000 деньгами.
  leg(3, '2026-03-02', 100, 0, 90000),
  leg(3, '2026-03-02', 500, 90000, 0),
  // Документ, чьи ноги разошлись по месяцам: денежная нога в январе,
  // расходная — в феврале. Признак «оплачено деньгами» считается по всему
  // отрезку, поэтому расход не теряется.
  leg(4, '2026-01-31', 100, 0, 10000),
  leg(4, '2026-02-01', 500, 10000, 0),
  // Начисление без денег — в кассовую свёртку не попадает.
  { ...leg(5, '2026-02-10', 500, 5000, 0), referenceType: 'Bill' },
  { ...leg(5, '2026-02-10', 700, 0, 5000), referenceType: 'Bill' },
];

function makeService(onLegsQuery?: (qb: any) => void) {
  const articleModel = () => ({
    query: () => ({
      orderBy: () =>
        Promise.resolve([
          { id: 1, name: 'Аренда', kind: 'expense', parentId: null },
          { id: 2, name: 'Выручка', kind: 'income', parentId: null },
        ]),
    }),
  });
  const articleAccountModel = () => ({
    query: () =>
      Promise.resolve([
        { accountId: 500, articleId: 1 },
        { accountId: 600, articleId: 2 },
      ]),
  });
  const accountModel = () => ({
    query: () => ({
      whereIn: () =>
        Promise.resolve([
          { id: 500, accountNormal: 'debit' },
          { id: 600, accountNormal: 'credit' },
        ]),
      onBuild: () => Promise.resolve([{ id: 100 }]),
    }),
  });
  let legsQueries = 0;
  const accountTransactionModel = () => ({
    query: () => ({
      onBuild: (cb: (qb: any) => void) => {
        legsQueries += 1;
        const qb: any = {
          modify: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          whereIn: jest.fn().mockReturnThis(),
          orWhereNull: jest.fn().mockReturnThis(),
        };
        cb(qb);
        onLegsQuery?.(qb);
        return Promise.resolve(LEGS);
      },
    }),
  });

  const service = new ArticlesCashflowRollupService(
    articleModel as any,
    articleAccountModel as any,
    accountModel as any,
    accountTransactionModel as any,
  );
  return { service, legsQueries: () => legsQueries };
}

const amountOf = (rows: any[], id: number) =>
  rows.find((row) => row.id === id)?.amount ?? 0;

describe('кассовая свёртка по периодам', () => {
  it('раскладывает деньги по месяцам', async () => {
    const { service } = makeService();

    const result = await service.getRollupByPeriods({} as any, [
      JANUARY,
      FEBRUARY,
      MARCH,
    ]);

    expect(result.map((period) => amountOf(period.rows, 1))).toEqual([
      150000,
      // Расходная нога документа 4 — в феврале; начисление без денег — нет.
      10000,
      90000,
    ]);
    expect(result.map((period) => amountOf(period.rows, 2))).toEqual([
      0, 400000, 0,
    ]);
  });

  it('сумма колонок равна свёртке за весь отрезок', async () => {
    const { service } = makeService();

    const byPeriods = await service.getRollupByPeriods({} as any, [
      JANUARY,
      FEBRUARY,
      MARCH,
    ]);
    const whole = await service.getRollup({
      fromDate: JANUARY.fromDate,
      toDate: MARCH.toDate,
    } as any);

    [1, 2].forEach((articleId) => {
      const sum = byPeriods.reduce(
        (total, period) => total + amountOf(period.rows, articleId),
        0,
      );
      expect(sum).toBe(amountOf(whole, articleId));
    });
  });

  it('читает ноги ОДИН раз на весь отрезок, а не по разу на колонку', async () => {
    let dateRange: any[] = [];
    const { service, legsQueries } = makeService((qb) => {
      dateRange = qb.modify.mock.calls.find(
        ([name]: any[]) => name === 'filterDateRange',
      );
    });

    await service.getRollupByPeriods({} as any, [JANUARY, FEBRUARY, MARCH]);

    expect(legsQueries()).toBe(1);
    expect(dateRange).toEqual(['filterDateRange', '2026-01-01', '2026-03-31']);
  });

  it('разрез отчёта доходит до выборки ног', async () => {
    let scoped = false;
    const { service } = makeService((qb) => {
      scoped = qb.where.mock.calls.some(
        ([arg]: any[]) => typeof arg === 'function',
      );
    });

    await service.getRollupByPeriods({ legalEntityIds: [7] } as any, [JANUARY]);

    expect(scoped).toBe(true);
  });

  it('без периодов — пусто и без запросов', async () => {
    const { service, legsQueries } = makeService();

    expect(await service.getRollupByPeriods({} as any, [])).toEqual([]);
    expect(legsQueries()).toBe(0);
  });
});

describe('номер периода по дате', () => {
  const periods = [JANUARY, FEBRUARY, MARCH];

  it('находит период, включая границы', () => {
    expect(periodIndexOf(periods, '2026-01-01')).toBe(0);
    expect(periodIndexOf(periods, '2026-01-31')).toBe(0);
    expect(periodIndexOf(periods, '2026-02-01')).toBe(1);
    expect(periodIndexOf(periods, '2026-03-31')).toBe(2);
  });

  it('дата вне отрезка — ни в один', () => {
    expect(periodIndexOf(periods, '2025-12-31')).toBe(-1);
    expect(periodIndexOf(periods, '2026-04-01')).toBe(-1);
    expect(periodIndexOf(periods, null)).toBe(-1);
  });
});

describe('дата ноги', () => {
  it('объект даты из базы → ГГГГ-ММ-ДД', () => {
    expect(legDate({ date: new Date('2026-02-05T00:00:00') })).toBe('2026-02-05');
  });

  it('строка — первые десять знаков', () => {
    expect(legDate({ date: '2026-02-05 00:00:00' })).toBe('2026-02-05');
  });

  it('пусто — пусто', () => {
    expect(legDate({ date: null })).toBeNull();
  });
});
