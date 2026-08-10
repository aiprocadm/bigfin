// © 2026 Bigfin
import { LedgerStorageService } from './LedgerStorage.service';
import { Ledger } from './Ledger';
import { AccountNormal } from '@/interfaces/Account';
import { ERRORS } from './Ledger.constants';

const entry = (over: Partial<any> = {}) => ({
  credit: 0,
  debit: 0,
  accountId: 1,
  accountNormal: AccountNormal.DEBIT,
  transactionType: 'SaleInvoice',
  transactionId: 5,
  date: '2026-03-10',
  index: 1,
  indexGroup: 10,
  currencyCode: 'RUB',
  exchangeRate: 1,
  ...over,
});

const buildStorage = () => {
  const saved: any[] = [];
  const storage = new LedgerStorageService(
    { saveContactsBalance: async () => saved.push('contacts') } as any,
    { saveAccountsBalance: async () => saved.push('accounts') } as any,
    { saveEntries: async () => saved.push('entries') } as any,
    (() => ({})) as any,
  );
  return { storage, saved };
};

describe('LedgerStorage — предохранитель двойной записи', () => {
  it('сходящийся журнал записывается', async () => {
    const { storage, saved } = buildStorage();
    const ledger = new Ledger([
      entry({ debit: 120000 }),
      entry({ credit: 100000, index: 2 }),
      entry({ credit: 20000, index: 3, indexGroup: 30 }),
    ]);

    await storage.commit(ledger as any);

    expect(saved).toEqual(['entries', 'accounts', 'contacts']);
  });

  it('несходящийся журнал не записывается вовсе', async () => {
    // Ровно тот случай, что осел в Балансе молча: счёт с НДС, где дебиторка
    // 120 000 стояла против кредита 100 000.
    const { storage, saved } = buildStorage();
    const ledger = new Ledger([
      entry({ debit: 120000 }),
      entry({ credit: 100000, index: 2 }),
    ]);

    await expect(storage.commit(ledger as any)).rejects.toMatchObject({
      errorType: ERRORS.LEDGER_NOT_BALANCED,
    });
    // Главное: ни одна из трёх записей не выполнена.
    expect(saved).toEqual([]);
  });

  it('в ошибке видно, на сколько и по какому документу разошлось', async () => {
    const { storage } = buildStorage();
    const ledger = new Ledger([
      entry({ debit: 500, transactionType: 'Bill', transactionId: 42 }),
    ]);

    await expect(storage.commit(ledger as any)).rejects.toMatchObject({
      payload: {
        difference: '500.00',
        transactionType: 'Bill',
        transactionId: 42,
      },
    });
  });

  it('копеечный хвост расхождением не считается', async () => {
    const { storage, saved } = buildStorage();
    const ledger = new Ledger([
      entry({ debit: 100.001 }),
      entry({ credit: 100, index: 2 }),
    ]);

    await storage.commit(ledger as any);

    expect(saved).toHaveLength(3);
  });

  it('пустой журнал проходит: записывать нечего', async () => {
    const { storage } = buildStorage();

    await expect(storage.commit(new Ledger([]) as any)).resolves.toBeUndefined();
  });
});
