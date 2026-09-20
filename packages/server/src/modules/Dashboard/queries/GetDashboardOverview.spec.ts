// © 2026 Bigfin
import { GetDashboardOverviewService } from './GetDashboardOverview.service';
import { ProfitLossAggregateNodeId } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheet.types';

/**
 * Этап 2 ТЗ, п. 2.3. Главная считает те же суммы, что и отчёты.
 *
 * Требование ТЗ дословно: «суммы на главной совпадают с суммами
 * соответствующих отчётов до копейки». Поэтому доходы, расходы и прибыль
 * берутся из узлов отчёта о прибылях и убытках, а не считаются заново.
 *
 * Здесь проверяется именно это: подставляем отчёт с известными числами и
 * смотрим, что на главную они попали без изменений, а изменение к прошлому
 * периоду посчитано от прошлого отчёта.
 */

/** Узел отчёта: как его отдаёт `ProfitLossSheetService`. */
const node = (id: string, amount: number, children: any[] = []) => ({
  id,
  name: id,
  total: { amount },
  children,
});

/** Отчёт за период: доходы, расходы и статьи внутри расходов. */
const report = (
  income: number,
  expenses: number,
  expenseRows: Array<[string, number]> = [],
) => ({
  data: [
    node(ProfitLossAggregateNodeId.INCOME, income),
    node(
      ProfitLossAggregateNodeId.EXPENSES,
      expenses,
      expenseRows.map(([name, amount]) => ({
        id: name,
        name,
        total: { amount },
      })),
    ),
  ],
});

/** Модель-счётчик: отдаёт заданное число строк. */
const countingModel = (size: number) => () => ({
  query: () => {
    const chain: any = {
      where: () => chain,
      modify: () => chain,
      resultSize: async () => size,
    };
    return chain;
  },
});

const buildService = (options: {
  current: any;
  previous: any;
  periods?: any;
  accounts?: any[];
  uncategorized?: number;
  pendingRequests?: number;
  gap?: any;
  overdue?: number;
  insights?: any;
  insightsFail?: boolean;
}) => {
  const calls: any[] = [];

  const profitLoss = {
    profitLossSheet: async (query: any) => {
      calls.push(query);
      // Разрез по периодам различаем по `displayColumnsType` — это и есть
      // РЕЖИМ КОЛОНОК. Раньше здесь стояло `displayColumnsBy`, то есть
      // ЕДИНИЦА ВРЕМЕНИ: заглушка повторяла ту же путаницу, что и код, и
      // потому не могла её заметить. А в самом коде эта путаница вешала
      // сервер бесконечным циклом по датам.
      if (query.displayColumnsType === 'date_periods') {
        return options.periods ?? { data: [] };
      }
      // Первый вызов — текущий период, второй — предыдущий.
      return calls.filter((c) => !c.displayColumnsType).length === 1
        ? options.current
        : options.previous;
    },
  };

  const moneySummary = {
    getMoneySummary: async () => ({
      cashBalance: { amount: 1000, formattedAmount: '1000.00 RUB' },
      receivableOverdue: {
        amount: options.overdue ?? 0,
        formattedAmount: `${(options.overdue ?? 0).toFixed(2)} RUB`,
      },
    }),
  };

  const paymentCalendar = {
    getForecast: async () => ({ gap: options.gap ?? null }),
  };

  const tenancyContext = {
    getTenantMetadata: async () => ({ baseCurrency: 'RUB' }),
  };

  const accountModel = () => ({
    query: () => ({
      whereIn: () => ({
        where: async () => options.accounts ?? [],
      }),
    }),
  });

  // Два блока «на ком держится бизнес» едут тем же ответом (FIN-018).
  const insightsCalls: any[] = [];
  const homepageInsights = {
    getInsights: async (period: any, sortBy: any) => {
      insightsCalls.push({ period, sortBy });

      if (options.insightsFail) throw new Error('база недоступна');

      return (
        options.insights ?? {
          topContractors: { rows: [], totalRevenue: 0 },
          directionsProfit: { rows: [], unassigned: null, sortBy },
        }
      );
    },
  };

  const service = new GetDashboardOverviewService(
    profitLoss as any,
    moneySummary as any,
    paymentCalendar as any,
    homepageInsights as any,
    tenancyContext as any,
    accountModel as any,
    countingModel(options.uncategorized ?? 0) as any,
    countingModel(options.pendingRequests ?? 0) as any,
  );
  return { service, calls, insightsCalls };
};

describe('главная: всё одним ответом', () => {
  it('доходы и расходы берутся из отчёта без пересчёта', async () => {
    const { service } = buildService({
      current: report(500_000, 320_000),
      previous: report(400_000, 300_000),
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    expect(overview.tiles.income.amount).toBe(500_000);
    expect(overview.tiles.expenses.amount).toBe(320_000);
    // Прибыль — разность тех же узлов, а не отдельный расчёт.
    expect(overview.tiles.netProfit.amount).toBe(180_000);
  });

  it('изменение считается от предыдущего периода такой же длины', async () => {
    const { service, calls } = buildService({
      current: report(500_000, 320_000),
      previous: report(400_000, 300_000),
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    // Март сравнивается с 31 днём до него, а не с «прошлым месяцем» вообще.
    const previousQuery = calls.filter((c) => !c.displayColumnsBy)[1];
    expect(previousQuery.fromDate).toBe('2026-01-29');
    expect(previousQuery.toDate).toBe('2026-02-28');

    expect(overview.tiles.income.changePercent).toBe(25);
    expect(overview.tiles.netProfit.marginPercent).toBe(36);
  });

  it('без прошлых чисел изменение не выдумывается', async () => {
    const { service } = buildService({
      current: report(100_000, 40_000),
      previous: report(0, 0),
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    // Ноль в знаменателе — это «сравнивать не с чем», а не «рост на 100%».
    expect(overview.tiles.income.changePercent).toBeNull();
    expect(overview.tiles.expenses.changePercent).toBeNull();
  });

  it('топ статей расходов отсортирован и знает свою долю', async () => {
    const { service } = buildService({
      current: report(0, 100_000, [
        ['Аренда', 50_000],
        ['Реклама', 30_000],
        ['Связь', 20_000],
      ]),
      previous: report(0, 0),
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    expect(overview.topExpenses.map((row) => row.name)).toEqual([
      'Аренда',
      'Реклама',
      'Связь',
    ]);
    expect(overview.topExpenses[0].sharePercent).toBe(50);
    expect(overview.topExpenses[2].sharePercent).toBe(20);
  });

  it('период по умолчанию — текущий месяц', async () => {
    const { service } = buildService({
      current: report(0, 0),
      previous: report(0, 0),
    });

    const overview = await service.getOverview();

    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}`;
    expect(overview.period.fromDate.startsWith(expectedMonth)).toBe(true);
  });

  it('график отдаёт двенадцать месяцев подряд', async () => {
    const { service } = buildService({
      current: report(0, 0),
      previous: report(0, 0),
      periods: {
        data: [
          {
            id: ProfitLossAggregateNodeId.INCOME,
            total: { amount: 0 },
            periods: Array.from({ length: 12 }, (_, i) => ({
              total: { amount: (i + 1) * 1000 },
            })),
          },
          {
            id: ProfitLossAggregateNodeId.EXPENSES,
            total: { amount: 0 },
            periods: Array.from({ length: 12 }, () => ({
              total: { amount: 500 },
            })),
          },
        ],
      },
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    expect(overview.months).toHaveLength(12);
    expect(overview.months[0].month).toBe('2025-04');
    expect(overview.months[11].month).toBe('2026-03');
    // Прибыль месяца — разность его же доходов и расходов.
    expect(overview.months[11]).toMatchObject({
      income: 12_000,
      expenses: 500,
      profit: 11_500,
    });
  });

  it('остатки по счетам приходят списком', async () => {
    const { service } = buildService({
      current: report(0, 0),
      previous: report(0, 0),
      accounts: [
        { id: 1, name: 'Расчётный счёт', amount: 250_000 },
        { id: 2, name: 'Касса', amount: 15_000 },
      ],
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    expect(overview.accounts).toEqual([
      {
        id: 1,
        name: 'Расчётный счёт',
        amount: 250_000,
        // ОЖИДАНИЕ ЗАКРЕПЛЯЛО ДЕФЕКТ. Здесь стояло «250000.00 RUB» —
      // ровно то, что живой проход нашёл на экране рядом с правильным
      // «1 749 839,09 ₽». Спека была зелёной и защищала неправду.
      // ПРОБЕЛ ЗДЕСЬ НЕРАЗРЫВНЫЙ (\u00A0), и это видно только так:
      // глазом он неотличим от обычного. Общий помощник ставит именно
      // его, чтобы сумма и знак рубля не разъехались переносом строки.
      formattedAmount: '250\u00A0000,00\u00A0₽',
      },
      { id: 2, name: 'Касса', amount: 15_000, formattedAmount: '15\u00A0000,00\u00A0₽' },
    ]);
  });

  it('«требует внимания» показывает только непустые строки', async () => {
    const { service } = buildService({
      current: report(0, 0),
      previous: report(0, 0),
      uncategorized: 12,
      overdue: 340_000,
      pendingRequests: 0,
      gap: null,
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    // Ни кассового разрыва, ни заявок — их строк быть не должно: карточка
    // «0 заявок ждут согласования» ничего не сообщает, а место занимает.
    expect(overview.attention.map((item) => item.kind)).toEqual([
      'uncategorized',
      'overdue_receivable',
    ]);
    expect(overview.attention[0].count).toBe(12);
    expect(overview.attention[1].amount).toBe(340_000);
  });

  it('кассовый разрыв приходит с днём и размером нехватки', async () => {
    const { service } = buildService({
      current: report(0, 0),
      previous: report(0, 0),
      gap: { date: '2026-03-14', amount: 340_000, daysFromStart: 5 },
    });

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    expect(overview.attention).toContainEqual({
      kind: 'cash_gap',
      date: '2026-03-14',
      amount: 340_000,
      formattedAmount: '340\u00A0000,00\u00A0₽',
    });
  });

  it('сбой отдельного источника не роняет главную', async () => {
    const { service } = buildService({
      current: report(100, 50),
      previous: report(0, 0),
    });

    // Платёжный календарь падает — остальная главная обязана собраться.
    (service as any).paymentCalendar = {
      getForecast: async () => {
        throw new Error('календарь недоступен');
      },
    };

    const overview = await service.getOverview('2026-03-01', '2026-03-31');

    expect(overview.tiles.income.amount).toBe(100);
    expect(overview.attention.some((i) => i.kind === 'cash_gap')).toBe(false);
  });

  describe('кто приносит прибыль и прибыльность направлений (FIN-018)', () => {
    it('оба блока приходят ТЕМ ЖЕ ответом', async () => {
      // Приёмка 4 FIN-018: главная по-прежнему делает один запрос. Отдельные
      // ручки под блоки означали бы пять запросов на самом частом экране.
      const { service } = buildService({
        current: report(100, 50),
        previous: report(0, 0),
        insights: {
          topContractors: {
            rows: [{ contactId: 7, name: 'ООО «Ромашка»', revenue: 100 }],
            totalRevenue: 100,
            concentrationCount: 1,
            verdict: 'SINGLE_CLIENT',
          },
          directionsProfit: {
            rows: [{ projectId: 3, name: 'Розница', profit: 50 }],
            unassigned: null,
            sortBy: 'profit',
          },
        },
      });

      const overview = await service.getOverview('2026-03-01', '2026-03-31');

      expect(overview.topContractors?.verdict).toBe('SINGLE_CLIENT');
      expect(overview.directionsProfit?.rows[0].name).toBe('Розница');
    });

    it('блоки считаются ЗА ТОТ ЖЕ период, что и плитки', async () => {
      // Иначе «выручка за март» в плитке и «выручка по клиентам» в блоке
      // разойдутся, и человек решит, что продукт врёт.
      const { service, insightsCalls } = buildService({
        current: report(100, 50),
        previous: report(0, 0),
      });

      await service.getOverview('2026-03-01', '2026-03-31');

      expect(insightsCalls[0].period).toEqual({
        fromDate: '2026-03-01',
        toDate: '2026-03-31',
      });
    });

    it('порядок направлений передаётся дальше', async () => {
      const { service, insightsCalls } = buildService({
        current: report(100, 50),
        previous: report(0, 0),
      });

      await service.getOverview('2026-03-01', '2026-03-31', 'margin');

      expect(insightsCalls[0].sortBy).toBe('margin');
    });

    it('сбой блоков НЕ РОНЯЕТ главную', async () => {
      // Остаток и то, что горит, важнее блока-аналитики.
      const { service } = buildService({
        current: report(100, 50),
        previous: report(0, 0),
        insightsFail: true,
      });

      const overview = await service.getOverview('2026-03-01', '2026-03-31');

      expect(overview.tiles.income.amount).toBe(100);
      // `null`, а не пустой блок: пустой блок читается как «клиентов нет»,
      // и это враньё.
      expect(overview.topContractors).toBeNull();
      expect(overview.directionsProfit).toBeNull();
    });
  });
});
