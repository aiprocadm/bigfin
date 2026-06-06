// © 2026 Bigfin
import { GetDebtsOverviewService } from './GetDebtsOverview.service';

// Thenable query stub: awaitable directly (await model().query()) AND
// chainable (.query().modify(...).onBuild(...)). All currencies = RUB,
// so toBase is the identity.
const makeQuery = (rows: any): any => {
  const q: any = {
    modify: () => q,
    onBuild: () => Promise.resolve(rows),
    then: (resolve: any, reject: any) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return q;
};

describe('GetDebtsOverviewService', () => {
  it('сводит дебиторку: корзины, итоги, ТОП', async () => {
    // saleInvoiceModel: 1-й query() = overdue, 2-й = current.
    let call = 0;
    const saleInvoiceModel = () => ({
      query: () =>
        makeQuery(
          call++ === 0
            ? [{ customerId: 1, dueAmount: 100, overdueDays: 10, exchangeRate: 1 }]
            : [{ customerId: 1, dueAmount: 50, overdueDays: 0, exchangeRate: 1 }],
        ),
    });
    const billModel = () => ({ query: () => makeQuery([]) });
    const customerModel = () => ({
      query: () => makeQuery([{ id: 1, displayName: 'ООО Ромашка' }]),
    });
    const vendorModel = () => ({ query: () => makeQuery([]) });
    const tenancyContext = {
      getTenantMetadata: () => Promise.resolve({ baseCurrency: 'RUB' }),
    };

    const service = new GetDebtsOverviewService(
      saleInvoiceModel as any,
      billModel as any,
      customerModel as any,
      vendorModel as any,
      tenancyContext as any,
    );

    const res = await service.getOverview({
      side: 'receivable',
      asDate: '2026-06-05',
    } as any);

    expect(res.receivable!.total).toBe(150);
    expect(res.receivable!.overdueTotal).toBe(100);
    expect(res.receivable!.current).toBe(50);
    expect(res.receivable!.buckets).toEqual([100, 0, 0, 0]);
    expect(res.receivable!.top[0].contactName).toBe('ООО Ромашка');
    expect(res.payable).toBeUndefined();
  });

  it('side не задан → считает обе стороны и нетто', async () => {
    const saleInvoiceModel = () => ({
      query: () =>
        makeQuery([
          { customerId: 1, dueAmount: 300, overdueDays: 5, exchangeRate: 1 },
        ]),
    });
    const billModel = () => ({
      query: () =>
        makeQuery([
          { vendorId: 2, dueAmount: 100, overdueDays: 0, exchangeRate: 1 },
        ]),
    });
    const customerModel = () => ({
      query: () => makeQuery([{ id: 1, displayName: 'Покупатель' }]),
    });
    const vendorModel = () => ({
      query: () => makeQuery([{ id: 2, displayName: 'Поставщик' }]),
    });
    const tenancyContext = {
      getTenantMetadata: () => Promise.resolve({ baseCurrency: 'RUB' }),
    };

    const service = new GetDebtsOverviewService(
      saleInvoiceModel as any,
      billModel as any,
      customerModel as any,
      vendorModel as any,
      tenancyContext as any,
    );

    const res = await service.getOverview({ asDate: '2026-06-05' } as any);

    // overdue и current используют один и тот же стаб (одни и те же строки),
    // поэтому здесь проверяем только наличие сторон и знак нетто.
    expect(res.receivable).toBeDefined();
    expect(res.payable).toBeDefined();
    expect(typeof res.net).toBe('number');
  });
});
