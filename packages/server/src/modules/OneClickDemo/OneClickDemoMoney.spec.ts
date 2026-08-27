// © 2026 Bigfin
import { SeedOneClickDemoDataService } from './commands/SeedOneClickDemoData.service';
import {
  DEMO_INVOICES,
  DEMO_PAYMENTS,
  DEMO_EXPENSES,
} from './OneClickDemo.data';

/**
 * С3 карты v29. В демо должны двигаться деньги.
 *
 * Демо-организация содержала клиентов, услуги и три счёта покупателям — и
 * ни одной оплаты. Продукт про управление деньгами показывал бизнес, в
 * котором деньги не движутся: «Поступления оплат» пусты, отчёт «Откуда
 * пришли и куда ушли деньги» даёт чистый поток 0,00 ₽, три плитки сводки
 * из четырёх — нули, а собственный список «Первые шаги» отмечает 4 из 5 и
 * ждёт как раз шага «Отметить первую полученную оплату».
 *
 * Витрина обязана показывать движение: часть счетов оплачена (одна оплата
 * полная, одна частичная — чтобы был виден и остаток долга), деньги
 * уходят на обычные расходы.
 */
const ACCOUNTS: Record<string, { id: number }> = {
  'sales-of-product-income': { id: 11 },
  'cost-of-goods-sold': { id: 22 },
  'bank-account': { id: 33 },
  rent: { id: 44 },
  'office-expenses': { id: 55 },
  'bank-fees-and-charges': { id: 66 },
};

/** Итог счёта покупателю по его позициям. */
const invoiceTotal = (invoice: (typeof DEMO_INVOICES)[number]) =>
  invoice.entries.reduce((sum, e) => sum + e.quantity * e.rate, 0);

const buildSeedService = ({ withInvoices = true } = {}) => {
  const createCustomer = jest
    .fn()
    .mockImplementation(async (dto: any) => ({ id: 100 + dto.displayName.length }));
  const createItem = jest.fn().mockResolvedValue(7);
  let invoiceSeq = 0;
  const createInvoice = jest
    .fn()
    .mockImplementation(async () => ({ id: (invoiceSeq += 1) * 10 }));
  const createPayment = jest.fn().mockResolvedValue({ id: 1 });
  const createExpense = jest.fn().mockResolvedValue({ id: 1 });

  const accountModel = () => ({
    query: () => ({
      findOne: async ({ slug }: any) =>
        withInvoices ? ACCOUNTS[slug] : undefined,
    }),
  });

  const service = new SeedOneClickDemoDataService(
    { createCustomer } as any,
    { createItem } as any,
    { createSaleInvoice: createInvoice } as any,
    { createPaymentReceived: createPayment } as any,
    { newExpense: createExpense } as any,
    accountModel as any,
  );
  return { service, createInvoice, createPayment, createExpense };
};

describe('в демо двигаются деньги', () => {
  it('перечень оплат и расходов задан', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(DEMO_PAYMENTS.length).toBeGreaterThanOrEqual(2);
    expect(DEMO_EXPENSES.length).toBeGreaterThanOrEqual(2);
  });

  it('есть и полная оплата, и частичная — иначе не виден остаток долга', () => {
    const kinds = DEMO_PAYMENTS.map((payment) => {
      const total = invoiceTotal(DEMO_INVOICES[payment.invoiceIndex]);
      if (payment.amount === total) return 'полная';
      return payment.amount < total ? 'частичная' : 'больше счёта';
    });

    expect(kinds).toContain('полная');
    expect(kinds).toContain('частичная');
    // Оплата больше счёта — заведомая ошибка данных: продукт её не примет.
    expect(kinds).not.toContain('больше счёта');
  });

  it('оплаты создаются и ссылаются на созданные счета', async () => {
    const { service, createPayment } = buildSeedService();

    await service.seedDemoData('RUB');

    expect(createPayment).toHaveBeenCalledTimes(DEMO_PAYMENTS.length);

    const created = createPayment.mock.calls.map(([dto]: any[]) => dto);
    created.forEach((dto) => {
      // Деньги приходят на расчётный счёт, а не «в никуда».
      expect(dto.depositAccountId).toBe(ACCOUNTS['bank-account'].id);
      expect(dto.entries.length).toBeGreaterThan(0);
      // Идентификаторы счетов — те, что вернула служба создания счетов
      // (10, 20, 30…), а не выдуманные номера.
      dto.entries.forEach((entry: any) => {
        expect(entry.invoiceId % 10).toBe(0);
        expect(entry.paymentAmount).toBeGreaterThan(0);
      });
    });
  });

  it('расходы создаются и списываются с расчётного счёта', async () => {
    const { service, createExpense } = buildSeedService();

    await service.seedDemoData('RUB');

    expect(createExpense).toHaveBeenCalledTimes(DEMO_EXPENSES.length);

    createExpense.mock.calls.forEach(([dto]: any[]) => {
      expect(dto.paymentAccountId).toBe(ACCOUNTS['bank-account'].id);
      expect(dto.categories.length).toBeGreaterThan(0);
      expect(dto.categories[0].amount).toBeGreaterThan(0);
    });
  });

  it('расходы не превышают полученных денег — демо не уходит в минус', () => {
    const received = DEMO_PAYMENTS.reduce((sum, p) => sum + p.amount, 0);
    const spent = DEMO_EXPENSES.reduce((sum, e) => sum + e.amount, 0);

    expect(spent).toBeLessThan(received);
  });

  it('без счетов покупателям оплат не создаём', async () => {
    const { service, createPayment, createExpense } = buildSeedService({
      withInvoices: false,
    });

    await service.seedDemoData('RUB');

    // Нет счёта доходов → нет позиций → нет счетов покупателям. Оплачивать
    // нечего, и постройка организации не должна из-за этого падать.
    expect(createPayment).not.toHaveBeenCalled();
    expect(createExpense).not.toHaveBeenCalled();
  });
});
