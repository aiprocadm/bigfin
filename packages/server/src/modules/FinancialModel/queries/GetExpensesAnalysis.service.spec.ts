// © 2026 Bigfin
import {
  EXPENSE_MONTHS_LIMIT,
  GetExpensesAnalysisService,
} from './GetExpensesAnalysis.service';

/**
 * Этап 9 ТЗ, экран «Анализ расходов».
 *
 * Правила счёта проверены на голых данных в `expensesAnalysisMath.spec.ts`.
 * Здесь — сборка экрана: какие периоды спрашиваются и не спорят ли числа
 * между собой.
 */

const article = (over: Partial<any> = {}) => ({
  id: 1,
  name: 'Аренда',
  kind: 'expense',
  costBehavior: 'fixed',
  parentId: null,
  amount: 100,
  ...over,
});

const buildService = (options: {
  own?: any[];
  rolled?: any[];
  breakEven?: any;
  onQuery?: (kind: string, query: any) => void;
} = {}) => {
  const rollup = {
    getOwnAmounts: async (query: any) => {
      options.onQuery?.('own', query);
      return options.own ?? [];
    },
    getRollup: async (query: any) => {
      options.onQuery?.('rollup', query);
      return options.rolled ?? [];
    },
  };

  const breakEvenService = {
    getBreakEven: async () =>
      options.breakEven ?? {
        revenue: 0,
        margin: 0,
        fixedCosts: 0,
        breakEven: { value: 0, applicable: false },
        hasFixedArticles: false,
      },
  };

  return new GetExpensesAnalysisService(
    rollup as any,
    breakEvenService as any,
  );
};

describe('GetExpensesAnalysisService', () => {
  it('прошлый период берётся той же длины и встык', async () => {
    // Сравнивать март с целым прошлым годом — значит показать «падение
    // расходов» там, где его нет.
    const seen: any[] = [];
    const service = buildService({
      onQuery: (kind, query) => {
        if (kind === 'own') seen.push(query);
      },
    });

    await service.getExpensesAnalysis({
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });

    // Первый запрос — текущий период, второй — прошлый.
    expect(seen[0].fromDate).toBe('2026-03-01');
    // Март 1–31 — это 31 день (обе границы входят). Прошлый период той же
    // длины заканчивается 28 февраля и начинается 29 января: 3 дня января
    // плюс 28 дней февраля. Ровно 31.
    expect(seen[1]).toMatchObject({
      fromDate: '2026-01-29',
      toDate: '2026-02-28',
    });
  });

  it('линия по месяцам не длиннее двух лет', async () => {
    // Каждый месяц — отдельный поход в базу; шестьдесят походов ради
    // нечитаемой линии никому не нужны.
    const service = buildService();

    const result = await service.getExpensesAnalysis({
      fromDate: '2020-01-01',
      toDate: '2026-12-31',
    });

    expect(result.monthly.length).toBe(EXPENSE_MONTHS_LIMIT);
    // Показываем хвост — последние месяцы, а не начало пятилетки.
    expect(result.monthly[result.monthly.length - 1].month).toBe('2026-12');
  });

  it('разрезы доходят до свёртки, а не теряются по дороге', async () => {
    // Иначе экран показывал бы цифры всей фирмы под заголовком одного
    // направления.
    const seen: any[] = [];
    const service = buildService({
      onQuery: (_kind, query) => seen.push(query),
    });

    await service.getExpensesAnalysis({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
      branchesIds: [7],
      projectId: 3,
    });

    expect(seen.length).toBeGreaterThan(0);
    seen.forEach((query) => {
      expect(query.branchesIds).toEqual([7]);
      expect(query.projectId).toBe(3);
    });
  });

  it('выручка берётся свёрткой по дереву, а не суммой всех строк', async () => {
    // В свёртке корневая строка уже содержит сумму потомков; сложить всё
    // подряд — задвоить выручку.
    const service = buildService({
      rolled: [
        article({ id: 1, kind: 'income', parentId: null, amount: 1_000 }),
        article({ id: 2, kind: 'income', parentId: 1, amount: 600 }),
        article({ id: 3, kind: 'income', parentId: 1, amount: 400 }),
      ],
    });

    const result = await service.getExpensesAnalysis({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    });

    expect(result.revenue).toBe(1_000);
  });

  it('запас прочности считается от той же точки безубыточности', async () => {
    // Своя формула здесь означала бы два разных ответа на один вопрос
    // на двух экранах.
    const service = buildService({
      rolled: [article({ id: 1, kind: 'income', amount: 1_000_000 })],
      breakEven: {
        revenue: 1_000_000,
        margin: 0.4,
        fixedCosts: 320_000,
        breakEven: { value: 800_000, applicable: true },
        hasFixedArticles: true,
      },
    });

    const result = await service.getExpensesAnalysis({
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
    });

    expect(result.breakEven).toEqual({ value: 800_000, applicable: true });
    expect(result.safetyMargin).toEqual({ value: 0.2, applicable: true });
  });

  it('без размеченных статей экран честно сообщает, что расчёт неполон', async () => {
    const service = buildService({
      own: [article({ id: 1, costBehavior: null, amount: 500 })],
    });

    const result = await service.getExpensesAnalysis({
      fromDate: '2026-01-01',
      toDate: '2026-01-31',
    });

    expect(result.hasFixedArticles).toBe(false);
    expect(result.split.unset).toBe(500);
    expect(result.split.unsetArticles).toBe(1);
  });
});
