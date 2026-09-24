// © 2026 Bigfin
import {
  BALANCE_ADJUSTMENT_ACCOUNT,
  BALANCE_ADJUSTMENT_ARTICLE,
  computeBalanceCorrection,
  FIX_BALANCE_ERRORS,
  FixAccountBalanceService,
} from './FixAccountBalance.service';

/**
 * FT-071 ТЗ-3: фиксация остатка на дату.
 *
 * Приёмка: после фиксации остаток счёта на дату равен указанному, а в
 * истории видна корректирующая операция на сумму разницы. Проверяем
 * разницу и её знак, ноль (операции нет), и что операция идёт обычным путём
 * создания — на служебный счёт, размеченный служебной статьёй.
 */
describe('разница для фиксации остатка', () => {
  it('в банке больше, чем в учёте, — приход на разницу', () => {
    expect(computeBalanceCorrection(124_300, 125_000)).toEqual({
      difference: 700,
      transactionType: 'OwnerContribution',
      amount: 700,
    });
  });

  it('в банке меньше — списание, сумма операции положительная', () => {
    expect(computeBalanceCorrection(10_000.5, 9_000.25)).toEqual({
      difference: -1000.25,
      transactionType: 'OwnerDrawing',
      amount: 1000.25,
    });
  });

  it('копейка в копейку — корректировать нечего', () => {
    expect(computeBalanceCorrection(500.1 + 0.2, 500.3)).toBeNull();
    expect(computeBalanceCorrection(0, 0)).toBeNull();
  });

  it('разница в одну копейку — уже корректировка', () => {
    expect(computeBalanceCorrection(100, 100.01)?.amount).toBe(0.01);
  });
});

/** Подделка запроса Objection: цепочка вызовов, в конце — заданный ответ. */
const chain = (result: any, calls: any[] = []) => {
  const query: any = {
    where: (...args: any[]) => (calls.push(['where', ...args]), query),
    modify: (...args: any[]) => (calls.push(['modify', ...args]), query),
    first: async () => result,
    findById: async () => result,
    findOne: async (where: any) => (calls.push(['findOne', where]), result),
    insertAndFetch: async (row: any) => (calls.push(['insert', row]), { id: 900, ...row }),
    insert: async (row: any) => (calls.push(['insert', row]), row),
  };
  return query;
};

const build = (opts: {
  account: any;
  ledger: { debit: number; credit: number } | null;
  adjustmentAccount?: any;
  article?: any;
  mapping?: any;
}) => {
  const created: any[] = [];
  const accountCalls: any[] = [];
  const ledgerCalls: any[] = [];
  const articleCalls: any[] = [];
  const mappingCalls: any[] = [];
  let accountQueries = 0;

  const service = new FixAccountBalanceService(
    {
      newCashflowTransaction: async (dto: any) => {
        created.push(dto);
        return { id: 555 };
      },
    } as any,
    { getTenantMetadata: async () => ({ baseCurrency: 'RUB' }) } as any,
    // Первый запрос к счетам — сам денежный счёт, дальше — служебный.
    (() => ({
      query: () =>
        accountQueries++ === 0
          ? chain(opts.account, accountCalls)
          : chain(opts.adjustmentAccount ?? null, accountCalls),
    })) as any,
    (() => ({ query: () => chain(opts.ledger, ledgerCalls) })) as any,
    (() => ({ query: () => chain(opts.article ?? null, articleCalls) })) as any,
    (() => ({ query: () => chain(opts.mapping ?? null, mappingCalls) })) as any,
  );
  return { service, created, accountCalls, ledgerCalls, articleCalls, mappingCalls };
};

describe('FixAccountBalanceService', () => {
  const BANK = { id: 7, accountType: 'bank' };

  it('приёмка: разница становится операцией на дату, остаток сходится', async () => {
    const { service, created, ledgerCalls, accountCalls, articleCalls, mappingCalls } =
      build({ account: BANK, ledger: { debit: 150_000, credit: 25_700 } });

    const result = await service.fixBalance({
      accountId: 7,
      date: '2026-09-23',
      amount: 125_000,
    });

    // Остаток считался на конец именно этого дня.
    expect(ledgerCalls).toContainEqual(['modify', 'closingBalance', '2026-09-23']);
    expect(result).toEqual({
      created: true,
      accountId: 7,
      date: '2026-09-23',
      previousBalance: 124_300,
      targetBalance: 125_000,
      difference: 700,
      transactionId: 555,
    });
    // Операция — обычным путём создания, на дату фиксации, на разницу.
    expect(created).toEqual([
      expect.objectContaining({
        date: '2026-09-23',
        transactionType: 'OwnerContribution',
        amount: 700,
        cashflowAccountId: 7,
        creditAccountId: 900,
        publish: true,
      }),
    ]);
    expect(previousPlusDifference(result)).toBe(125_000);

    // Служебный счёт и статья заведены, счёт привязан к статье.
    expect(accountCalls).toContainEqual([
      'insert',
      expect.objectContaining({ slug: BALANCE_ADJUSTMENT_ACCOUNT.slug, currencyCode: 'RUB' }),
    ]);
    expect(articleCalls).toContainEqual([
      'insert',
      expect.objectContaining({
        seedKey: BALANCE_ADJUSTMENT_ARTICLE.seedKey,
        kind: 'equity',
        cashflowSection: 'adjustments',
      }),
    ]);
    expect(mappingCalls).toContainEqual(['insert', { articleId: 900, accountId: 900 }]);
  });

  it('остаток уже верный — операции нет, ответ говорит об этом', async () => {
    const { service, created } = build({
      account: BANK,
      ledger: { debit: 1000, credit: 0 },
    });

    const result = await service.fixBalance({
      accountId: 7,
      date: '2026-09-23',
      amount: 1000,
    });

    expect(result.created).toBe(false);
    expect(result.difference).toBe(0);
    expect(result.transactionId).toBeNull();
    expect(created).toEqual([]);
  });

  it('служебные счёт и статья уже есть — второй раз не заводятся', async () => {
    const { service, created, accountCalls, articleCalls, mappingCalls } = build({
      account: BANK,
      ledger: null,
      adjustmentAccount: { id: 31, slug: 'balance-adjustment' },
      article: { id: 44 },
      mapping: { articleId: 44, accountId: 31 },
    });

    const result = await service.fixBalance({
      accountId: 7,
      date: '2026-09-23',
      amount: -50,
    });

    // Проводок нет — остаток ноль; банк в минусе — списание.
    expect(result.previousBalance).toBe(0);
    expect(created[0]).toEqual(
      expect.objectContaining({ transactionType: 'OwnerDrawing', amount: 50, creditAccountId: 31 }),
    );
    expect(accountCalls.filter(([kind]) => kind === 'insert')).toEqual([]);
    expect(articleCalls.filter(([kind]) => kind === 'insert')).toEqual([]);
    expect(mappingCalls.filter(([kind]) => kind === 'insert')).toEqual([]);
  });

  it('остаток фиксируется только у кассы и банка', async () => {
    const { service } = build({
      account: { id: 8, accountType: 'accounts-receivable' },
      ledger: null,
    });

    await expect(
      service.fixBalance({ accountId: 8, date: '2026-09-23', amount: 1 }),
    ).rejects.toMatchObject({ errorType: FIX_BALANCE_ERRORS.NOT_MONEY_ACCOUNT });
  });

  it('несуществующая дата — понятный отказ, а не остаток «на никогда»', async () => {
    const { service } = build({ account: BANK, ledger: null });

    await expect(
      service.fixBalance({ accountId: 7, date: '2026-02-30', amount: 1 }),
    ).rejects.toMatchObject({ errorType: FIX_BALANCE_ERRORS.INVALID_DATE });
  });
});

function previousPlusDifference(result: { previousBalance: number; difference: number }) {
  return Math.round((result.previousBalance + result.difference) * 100) / 100;
}
