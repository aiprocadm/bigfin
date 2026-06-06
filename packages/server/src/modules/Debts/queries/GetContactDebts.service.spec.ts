// © 2026 Bigfin
import { GetContactDebtsService } from './GetContactDebts.service';

const makeQuery = (rows: any): any => {
  const q: any = {
    modify: () => q,
    onBuild: () => Promise.resolve(rows),
    then: (resolve: any, reject: any) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return q;
};

describe('GetContactDebtsService', () => {
  it('маппит неоплаченный счёт в DebtDocument (дебиторка)', async () => {
    const saleInvoiceModel = () => ({
      query: () =>
        makeQuery([
          {
            id: 7,
            invoiceNo: '12',
            invoiceDate: '2026-05-01',
            dueDate: '2026-05-15',
            total: 200,
            dueAmount: 120,
            overdueDays: 22,
            exchangeRate: 1,
          },
        ]),
    });
    const billModel = () => ({ query: () => makeQuery([]) });

    const service = new GetContactDebtsService(
      saleInvoiceModel as any,
      billModel as any,
    );
    const res = await service.getContactDebts(1, 'receivable');

    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      id: 7,
      number: '12',
      dueDate: '2026-05-15',
      total: 200,
      dueAmount: 120,
      overdueDays: 22,
      side: 'receivable',
    });
  });

  it('маппит неоплаченный счёт поставщика (кредиторка)', async () => {
    const saleInvoiceModel = () => ({ query: () => makeQuery([]) });
    const billModel = () => ({
      query: () =>
        makeQuery([
          {
            id: 3,
            billNumber: 'B-9',
            billDate: '2026-04-01',
            dueDate: '2026-04-20',
            total: 500,
            dueAmount: 500,
            overdueDays: 0,
            exchangeRate: 1,
          },
        ]),
    });

    const service = new GetContactDebtsService(
      saleInvoiceModel as any,
      billModel as any,
    );
    const res = await service.getContactDebts(2, 'payable');

    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      id: 3,
      number: 'B-9',
      dueAmount: 500,
      side: 'payable',
    });
  });
});
