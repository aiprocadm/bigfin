// © 2026 Bigfin
import { GetMoneySummaryService } from './GetMoneySummary.service';

/**
 * Г2 карты v20: главная должна отвечать на главный вопрос — «как дела с
 * деньгами». Цифры берутся из тех же отчётов, что показывают разделы
 * продукта: иначе главная и раздел разойдутся, и верить будет нечему.
 */
const buildService = ({
  accounts = [
    { accountType: 'bank', amount: 150000 },
    { accountType: 'cash', amount: 25000 },
  ],
  ar = { total: { total: { amount: 53000 }, current: { amount: 18000 } } },
  ap = { total: { total: { amount: 12000 }, current: { amount: 12000 } } },
  arThrows = false,
  // Дни прогноза платёжного календаря: null (а не отсутствие поля), чтобы
  // значение по умолчанию не перекрыло проверку «календарь молчит».
  forecastDays = [
    { date: '2026-08-25', inflow: 0, outflow: 0 },
    { date: '2026-08-27', inflow: 0, outflow: 40000 },
    { date: '2026-08-29', inflow: 0, outflow: 15000 },
  ],
  forecastThrows = false,
  // null, а не отсутствие поля: так отвечает сервис организации не на
  // упрощёнке — плитки налога быть не должно.
  taxEstimate = null,
  // Авансы: полученный закрывается работой, выданный — поставкой.
  advancesReceived = 0,
  advancesPaid = 0,
  advancesThrow = false,
}: any = {}) => {
  const accountModel = () => ({
    query: () => ({
      whereIn: () => ({ where: async () => accounts }),
    }),
  });

  const service = new GetMoneySummaryService(
    {
      ARAgingSummary: async () => {
        if (arThrows) throw new Error('отчёт недоступен');
        return { data: ar };
      },
    } as any,
    { APAgingSummary: async () => ({ data: ap }) } as any,
    {
      getForecast: async () => {
        if (forecastThrows) throw new Error('прогноз недоступен');
        return { days: forecastDays ?? [] };
      },
    } as any,
    // Оценка налога проверяется своими тестами (GetTaxEstimate.spec); здесь
    // важно лишь, что сводка её спрашивает и не падает без неё.
    { getTaxEstimate: async () => taxEstimate } as any,
    {
      getDebtBreakdown: async () => {
        if (advancesThrow) throw new Error('разбор недоступен');
        return { totals: { advancesReceived, advancesPaid } };
      },
    } as any,
    {
      getTenantMetadata: async () => ({ baseCurrency: 'RUB', tenantId: 7 }),
    } as any,
    accountModel as any,
  );
  return service;
};

describe('сводка «как дела с деньгами»', () => {
  it('складывает остатки расчётных счетов и кассы', async () => {
    const summary = await buildService().getMoneySummary();

    expect(summary.cashBalance.amount).toBe(175000);
  });

  it('показывает долг покупателей и его просроченную часть', async () => {
    const summary = await buildService().getMoneySummary();

    // Всего 53 000, из них 18 000 ещё не просрочено → просрочено 35 000.
    expect(summary.receivable.amount).toBe(53000);
    expect(summary.receivableOverdue.amount).toBe(35000);
  });

  it('когда всё оплачивается в срок, просрочки нет', async () => {
    const summary = await buildService().getMoneySummary();

    expect(summary.payable.amount).toBe(12000);
    expect(summary.payableOverdue.amount).toBe(0);
  });

  it('суммы приходят и числом, и читаемой записью в валюте организации', async () => {
    const summary = await buildService().getMoneySummary();

    expect(summary.currencyCode).toBe('RUB');
    expect(summary.cashBalance.formattedAmount).toContain('₽');
    expect(summary.cashBalance.formattedAmount).toMatch(/175\s?000/);
  });

  it('недоступный отчёт не роняет главную — это ноль, а не ошибка', async () => {
    // Пустая организация или сбой отчёта не должны выносить весь экран.
    const summary = await buildService({ arThrows: true }).getMoneySummary();

    expect(summary.receivable.amount).toBe(0);
    expect(summary.receivableOverdue.amount).toBe(0);
    // Остальные цифры при этом продолжают считаться.
    expect(summary.cashBalance.amount).toBe(175000);
  });

  it('пустая организация показывает нули, а не пустоту', async () => {
    const summary = await buildService({
      accounts: [],
      ar: { total: { total: { amount: 0 }, current: { amount: 0 } } },
      ap: { total: { total: { amount: 0 }, current: { amount: 0 } } },
    }).getMoneySummary();

    expect(summary.cashBalance.amount).toBe(0);
    expect(summary.receivable.amount).toBe(0);
    expect(summary.payable.amount).toBe(0);
  });
});

describe('плитка «ближайшие платежи»', () => {
  it('складывает расходы прогноза за ближайшую неделю', async () => {
    const summary = await buildService().getMoneySummary();

    // 40 000 + 15 000; день без расхода в сумму ничего не добавляет.
    expect(summary.upcomingPayments.amount).toBe(55000);
  });

  it('показывает день ближайшего платежа, а не первый день недели', async () => {
    const summary = await buildService().getMoneySummary();

    expect(summary.upcomingPaymentsDate).toBe('2026-08-27');
  });

  it('когда платить нечего — ноль и пустая дата', async () => {
    const summary = await buildService({
      forecastDays: [{ date: '2026-08-25', inflow: 0, outflow: 0 }],
    }).getMoneySummary();

    expect(summary.upcomingPayments.amount).toBe(0);
    expect(summary.upcomingPaymentsDate).toBeNull();
  });

  it('сбой прогноза не роняет остальную сводку', async () => {
    const summary = await buildService({ forecastThrows: true }).getMoneySummary();

    expect(summary.upcomingPayments.amount).toBe(0);
    expect(summary.upcomingPaymentsDate).toBeNull();
    // Главное: остальные плитки на месте.
    expect(summary.cashBalance.amount).toBe(175000);
  });
});

describe('авансы в сводке (FIN-023)', () => {
  it('полученные и выданные названы отдельно', async () => {
    const summary = await buildService({
      advancesReceived: 120000,
      advancesPaid: 45000,
    }).getMoneySummary();

    expect(summary.advancesReceived.amount).toBe(120000);
    expect(summary.advancesPaid.amount).toBe(45000);
  });

  it('НЕ складываются с долгом деньгами', async () => {
    // Полученный аванс закрывается работой, а не деньгами. Прибавить его к
    // долгу покупателей значит обещать себе денег больше, чем будет.
    const summary = await buildService({
      advancesReceived: 120000,
    }).getMoneySummary();

    expect(summary.receivable.amount).toBe(53000);
  });

  it('сбой разбора не роняет сводку', async () => {
    const summary = await buildService({ advancesThrow: true }).getMoneySummary();

    expect(summary.cashBalance.amount).toBe(175000);
    expect(summary.advancesReceived.amount).toBe(0);
  });
});
