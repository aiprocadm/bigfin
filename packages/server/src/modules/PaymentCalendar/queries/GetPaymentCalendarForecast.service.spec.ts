import { GetPaymentCalendarForecastService } from './GetPaymentCalendarForecast.service';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';

// Chainable query stub: supports any number of .modify() before a terminal
// .onBuild() that resolves to the given rows. All currencies = RUB (base),
// so conversion is the identity and exchangeRates.latest is never called.
const makeQuery = (rows: any) => {
  const q: any = {
    modify: () => q,
    onBuild: () => Promise.resolve(rows),
  };
  return q;
};

const accountModel = () => ({
  query: () => makeQuery([{ id: 12, amount: 100000, currencyCode: 'RUB' }]),
});
// Документы собираем настоящими моделями, а не голыми объектами: календарь
// берёт долг у геттера модели, и подделка молча дала бы «не число».
const invoiceModel = () => ({
  query: () =>
    makeQuery([
      SaleInvoice.fromJson({
        id: 1,
        dueDate: '2026-06-10',
        balance: 200000,
        paymentAmount: 0,
        writtenoffAmount: 0,
        creditedAmount: 0,
        currencyCode: 'RUB',
        exchangeRate: 1,
      }),
    ]),
});
const billModel = () => ({
  query: () =>
    makeQuery([
      Bill.fromJson({
        id: 1,
        dueDate: '2026-06-12',
        amount: 350000,
        paymentAmount: 0,
        creditedAmount: 0,
        currencyCode: 'RUB',
        exchangeRate: 1,
      }),
    ]),
});
const operationModel = () => ({ query: () => makeQuery([]) });
const tenancyContext = {
  getTenantMetadata: () =>
    Promise.resolve({ baseCurrency: 'RUB', tenantId: 1 }),
};
const exchangeRates = {
  latest: () => Promise.resolve({ exchangeRate: 1 }),
};
// Календарь организации не настроен — действуют умолчания.
const settingsStore = async () => ({ get: () => undefined });

describe('GetPaymentCalendarForecastService', () => {
  it('combines obligations into a daily forecast and finds the gap', async () => {
    const service = new GetPaymentCalendarForecastService(
      invoiceModel as any,
      billModel as any,
      accountModel as any,
      operationModel as any,
      tenancyContext as any,
      exchangeRates as any,
      settingsStore as any,
    );

    const res = await service.getForecast(1, {
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);

    expect(res.openingBalance).toBe(100000);
    // 10 июня: +200000 → 300000; 12 июня: −350000 → −50000 (разрыв).
    const gapDay = res.days.find((d) => d.date === '2026-06-12');
    expect(gapDay?.balance).toBe(-50000);
    expect(res.gap).toMatchObject({ date: '2026-06-12', amount: 50000 });
  });

  it('ждёт неоплаченный НДС по счёту, оплаченному без налога', async () => {
    // Счёт 100 000 + НДС 20 % оплачен на 100 000: к получению осталось 20 000.
    // Раньше календарь считал долг от подытога и показывал строку «0 ₽».
    const vatInvoiceModel = () => ({
      query: () =>
        makeQuery([
          SaleInvoice.fromJson({
            id: 2,
            dueDate: '2026-06-15',
            balance: 100000,
            taxAmountWithheld: 20000,
            isInclusiveTax: false,
            paymentAmount: 100000,
            writtenoffAmount: 0,
            creditedAmount: 0,
            currencyCode: 'RUB',
            exchangeRate: 1,
          }),
        ]),
    });
    const noBills = () => ({ query: () => makeQuery([]) });

    const service = new GetPaymentCalendarForecastService(
      vatInvoiceModel as any,
      noBills as any,
      accountModel as any,
      operationModel as any,
      tenancyContext as any,
      exchangeRates as any,
      settingsStore as any,
    );
    const res = await service.getForecast(1, {
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);

    const day = res.days.find((d) => d.date === '2026-06-15');
    expect(day?.inflow).toBe(20000);
    expect(day?.lines[0]).toMatchObject({ direction: 'inflow', amount: 20000 });
  });
});

/**
 * Р1 срез 1 (карта v16): валютный счёт без курса раньше молча считался один
 * к одному с рублём и завышал прогноз.
 */
describe('валютный документ без курса в прогнозе', () => {
  const buildService = (invoices: any[]) => {
    const invoicesModel = () => ({ query: () => makeQuery(invoices) });
    const emptyBills = () => ({ query: () => makeQuery([]) });

    return new GetPaymentCalendarForecastService(
      invoicesModel as any,
      emptyBills as any,
      accountModel as any,
      operationModel as any,
      tenancyContext as any,
      exchangeRates as any,
      settingsStore as any,
    );
  };

  const usdInvoice = (exchangeRate: any) =>
    SaleInvoice.fromJson({
      id: 7,
      dueDate: '2026-06-10',
      balance: 1000,
      amount: 1000,
      paymentAmount: 0,
      writtenoffAmount: 0,
      creditedAmount: 0,
      currencyCode: 'USD',
      exchangeRate,
    });

  it('курс есть — сумма пересчитана по нему', async () => {
    const service = buildService([usdInvoice(90)]);

    const res = await service.getForecast(1, {
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);
    const day = res.days.find((d) => d.date === '2026-06-10');

    expect(day?.inflow).toBe(90000);
    expect(res.unconvertedCount).toBe(0);
  });

  it('курса нет — строка НЕ попадает в прогноз и честно сосчитана', async () => {
    const service = buildService([usdInvoice(null)]);

    const res = await service.getForecast(1, {
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    } as any);
    const day = res.days.find((d) => d.date === '2026-06-10');

    // Раньше здесь было 1000 — доллар считался рублём.
    expect(day?.inflow).toBe(0);
    expect(res.unconvertedCount).toBe(1);
  });
});
