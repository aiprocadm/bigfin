// © 2026 Bigfin
import { CreateDividendPayoutService } from './CreateDividendPayout.service';

const uow = { withTransaction: (cb: any) => cb({}) };
const tenancyContext = {
  getTenantMetadata: () => Promise.resolve({ baseCurrency: 'RUB' }),
};

const makeService = (opts: {
  paymentAccount?: any;
  existingEquity?: any;
}) => {
  const inserted: any[] = [];
  const createdAccounts: any[] = [];
  const committedLedgers: any[] = [];

  const payoutModel = () => ({
    query: () => ({
      insertAndFetch: (attrs: any) => {
        const payout = { id: 7, ...attrs };
        inserted.push(payout);
        return Promise.resolve(payout);
      },
    }),
  });
  const accountModel = () => ({
    query: () => ({
      findById: () => Promise.resolve(opts.paymentAccount),
      findOne: () => Promise.resolve(opts.existingEquity),
      insertAndFetch: (attrs: any) => {
        const account = { id: 31, ...attrs };
        createdAccounts.push(account);
        return Promise.resolve(account);
      },
    }),
  });
  const ledgerStorage = {
    commit: (ledger: any) => {
      committedLedgers.push(ledger);
      return Promise.resolve();
    },
  };

  const service = new CreateDividendPayoutService(
    uow as any,
    ledgerStorage as any,
    tenancyContext as any,
    payoutModel as any,
    accountModel as any,
  );
  return { service, inserted, createdAccounts, committedLedgers };
};

const dto = {
  date: '2026-06-11',
  amount: 150000,
  paymentAccountId: 5,
  note: 'Дивиденды за II квартал',
};

describe('CreateDividendPayoutService', () => {
  it('сумма ≤ 0 отклоняется', async () => {
    const { service } = makeService({
      paymentAccount: { id: 5, accountType: 'bank' },
    });
    await expect(
      service.create({ ...dto, amount: 0 } as any),
    ).rejects.toMatchObject({ errorType: 'INVALID_AMOUNT' });
  });

  it('счёт списания не найден → ошибка', async () => {
    const { service } = makeService({ paymentAccount: undefined });
    await expect(service.create(dto as any)).rejects.toMatchObject({
      errorType: 'PAYMENT_ACCOUNT_NOT_FOUND',
    });
  });

  it('не-денежный счёт списания отклоняется', async () => {
    const { service } = makeService({
      paymentAccount: { id: 5, accountType: 'expense' },
    });
    await expect(service.create(dto as any)).rejects.toMatchObject({
      errorType: 'PAYMENT_ACCOUNT_NOT_CASH',
    });
  });

  it('создаёт выплату, equity-счёт лениво и сбалансированные GL-проводки', async () => {
    const { service, inserted, createdAccounts, committedLedgers } =
      makeService({
        paymentAccount: { id: 5, accountType: 'bank' },
        existingEquity: undefined,
      });

    const payout = await service.create(dto as any);

    // Equity-счёт создан find-or-create'ом.
    expect(createdAccounts).toHaveLength(1);
    expect(createdAccounts[0].slug).toBe('owner-payouts');
    expect(createdAccounts[0].accountType).toBe('equity');
    expect(createdAccounts[0].currencyCode).toBe('RUB');

    // Строка выплаты записана.
    expect(payout.id).toBe(7);
    expect(inserted[0].equityAccountId).toBe(31);
    expect(inserted[0].paymentAccountId).toBe(5);

    // Проводки: дебет equity / кредит денежного, баланс сходится.
    expect(committedLedgers).toHaveLength(1);
    const entries = committedLedgers[0].getEntries();
    expect(entries).toHaveLength(2);
    const debitEntry = entries.find((e: any) => e.debit > 0);
    const creditEntry = entries.find((e: any) => e.credit > 0);
    expect(debitEntry.accountId).toBe(31);
    expect(creditEntry.accountId).toBe(5);
    expect(debitEntry.debit).toBe(creditEntry.credit);
    expect(debitEntry.transactionType).toBe('DividendPayout');
  });

  it('существующий equity-счёт переиспользуется', async () => {
    const { service, createdAccounts, inserted } = makeService({
      paymentAccount: { id: 5, accountType: 'cash' },
      existingEquity: { id: 42, slug: 'owner-payouts' },
    });

    await service.create(dto as any);

    expect(createdAccounts).toHaveLength(0);
    expect(inserted[0].equityAccountId).toBe(42);
  });
});
