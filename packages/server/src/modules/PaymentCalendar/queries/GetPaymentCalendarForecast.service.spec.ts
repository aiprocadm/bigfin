import { GetPaymentCalendarForecastService } from './GetPaymentCalendarForecast.service';

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
const invoiceModel = () => ({
  query: () =>
    makeQuery([
      {
        id: 1,
        dueDate: '2026-06-10',
        balance: 200000,
        paymentAmount: 0,
        writtenoffAmount: 0,
        creditedAmount: 0,
        currencyCode: 'RUB',
        exchangeRate: 1,
      },
    ]),
});
const billModel = () => ({
  query: () =>
    makeQuery([
      {
        id: 1,
        dueDate: '2026-06-12',
        amount: 350000,
        paymentAmount: 0,
        creditedAmount: 0,
        currencyCode: 'RUB',
        exchangeRate: 1,
      },
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

describe('GetPaymentCalendarForecastService', () => {
  it('combines obligations into a daily forecast and finds the gap', async () => {
    const service = new GetPaymentCalendarForecastService(
      invoiceModel as any,
      billModel as any,
      accountModel as any,
      operationModel as any,
      tenancyContext as any,
      exchangeRates as any,
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
});
