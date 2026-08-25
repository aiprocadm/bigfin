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
    { getTenantMetadata: async () => ({ baseCurrency: 'RUB' }) } as any,
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
