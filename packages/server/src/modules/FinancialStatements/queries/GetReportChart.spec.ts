// © 2026 Bigfin
import { GetReportChartService } from './GetReportChart.service';
import { ProfitLossAggregateNodeId } from '../modules/ProfitLossSheet/ProfitLossSheet.types';

/**
 * Этап 4 ТЗ, п. 4.2. График над таблицей отчёта.
 *
 * График обязан показывать ровно те же числа, что таблица под ним. Поэтому
 * у ОПиУ столбцы берутся из узлов самого отчёта, а у ДДС — из движения по
 * денежным счетам, то есть из того же источника, что и остатки в «Банке».
 *
 * Вторая вещь, которую легко испортить: перепутать сторону у ДДС. Приход
 * лежит в дебете денежного счёта, расход — в кредите; ошибка здесь
 * перевернёт весь график, и никто сразу не заметит.
 */
const profitLossOf = (income: number, expenses: number) => ({
  data: [
    {
      id: ProfitLossAggregateNodeId.INCOME,
      total: { amount: income },
      children: [],
    },
    {
      id: ProfitLossAggregateNodeId.EXPENSES,
      total: { amount: expenses },
      children: [],
    },
  ],
});

const buildService = (options: {
  byMonth?: Record<string, { income: number; expenses: number }>;
  accounts?: any[];
  totals?: Record<string, { debit: number; credit: number }>;
}) => {
  const asked: string[] = [];

  const profitLoss = {
    profitLossSheet: async (query: any) => {
      asked.push(query.fromDate);
      const month = String(query.fromDate).slice(0, 7);
      const row = options.byMonth?.[month] ?? { income: 0, expenses: 0 };
      return profitLossOf(row.income, row.expenses);
    },
  };

  const accountModel = () => ({
    query: () => ({
      whereIn: () => ({
        where: async () => options.accounts ?? [],
      }),
    }),
  });

  const transactionModel = () => {
    const state: any = { from: '' };
    const chain: any = {
      whereIn: () => chain,
      where: (column: string, _op: string, value: string) => {
        if (column === 'date' && !state.from) state.from = value;
        return chain;
      },
      sum: () => chain,
      first: async () => {
        const month = state.from.slice(0, 7);
        return options.totals?.[month] ?? { debit: 0, credit: 0 };
      },
    };
    return { query: () => chain };
  };

  const service = new GetReportChartService(
    profitLoss as any,
    transactionModel as any,
    accountModel as any,
  );
  return { service, asked };
};

describe('график над таблицей отчёта', () => {
  it('ОПиУ: столбцы — выручка и прибыль из узлов отчёта', async () => {
    const { service } = buildService({
      byMonth: {
        '2026-01': { income: 500_000, expenses: 300_000 },
        '2026-02': { income: 400_000, expenses: 450_000 },
      },
    });

    const chart = await service.getChart(
      'profit_loss',
      '2026-01-01',
      '2026-02-28',
    );

    expect(chart.points).toEqual([
      { month: '2026-01', first: 500_000, second: 200_000 },
      // Убыточный месяц показывается убытком, а не нулём.
      { month: '2026-02', first: 400_000, second: -50_000 },
    ]);
  });

  it('ДДС: приход из дебета, расход из кредита денежных счетов', async () => {
    const { service } = buildService({
      accounts: [{ id: 1 }, { id: 2 }],
      totals: {
        '2026-01': { debit: 700_000, credit: 250_000 },
      },
    });

    const chart = await service.getChart(
      'cash_flow',
      '2026-01-01',
      '2026-01-31',
    );

    expect(chart.points).toEqual([
      { month: '2026-01', first: 700_000, second: 250_000 },
    ]);
  });

  it('без денежных счетов график пустой, а не сломанный', async () => {
    const { service } = buildService({ accounts: [] });

    const chart = await service.getChart(
      'cash_flow',
      '2026-01-01',
      '2026-02-28',
    );

    expect(chart.points).toEqual([
      { month: '2026-01', first: 0, second: 0 },
      { month: '2026-02', first: 0, second: 0 },
    ]);
  });

  it('период раскладывается по месяцам целиком', async () => {
    const { service, asked } = buildService({});

    const chart = await service.getChart(
      'profit_loss',
      '2026-01-15',
      '2026-03-10',
    );

    // Неполные месяцы на краях периода всё равно показываются целыми
    // столбцами: половина столбца вводила бы в заблуждение.
    expect(chart.points.map((p) => p.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
    ]);
    expect(asked).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('слишком длинный период не разносит запрос на сотни месяцев', async () => {
    const { service } = buildService({});

    const chart = await service.getChart(
      'profit_loss',
      '2000-01-01',
      '2026-12-31',
    );

    // Каждый столбец — отдельный подсчёт; на экран больше и не влезет.
    expect(chart.points.length).toBeLessThanOrEqual(36);
  });
});
