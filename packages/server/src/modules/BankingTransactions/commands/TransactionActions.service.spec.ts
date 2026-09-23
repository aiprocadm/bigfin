// © 2026 Bigfin
import { TransactionActionsService } from './TransactionActions.service';

/**
 * Действия с операцией из реестра (FT-022…FT-025 ТЗ-3) на подделках:
 * метка у документа, сделка и перевод переписывают проводки, разбиение
 * требует статей со счетом, закрытый период отказывает.
 */
function makeActions(options: { locked?: boolean; articlesWithAccount?: number[] } = {}) {
  const operations = new Map<number, any>([
    [21, { id: 21, date: '2026-08-10', amount: 1000, transactionType: 'OtherExpense', cashflowAccountId: 1000, cashflowAccount: { currencyCode: 'RUB' }, projectId: null, deletedAt: null }],
    [22, { id: 22, date: '2026-08-11', amount: 500, transactionType: 'OtherExpense', cashflowAccountId: 1000, deletedAt: '2026-09-01' }],
  ]);
  const tags = new Map<number, any>();
  const calls: any = { revert: [], write: [], events: [], saveSplits: [], clearSplits: [] };

  const opModel = () => ({
    query: () => ({
      findById: (id: number) => {
        const p: any = Promise.resolve(operations.get(id));
        p.withGraphFetched = () => Promise.resolve(operations.get(id));
        p.patch = async (data: any) => Object.assign(operations.get(id), data);
        return p;
      },
    }),
  });
  const ledgerModel = () => ({
    query: () => {
      const where: any = {};
      const q: any = {
        where: (field: string, value: any) => {
          where[field] = value;
          return q;
        },
        first: async () =>
          where.referenceType === 'CashflowTransaction' && operations.has(Number(where.referenceId))
            ? { id: 1 }
            : undefined,
      };
      return q;
    },
  });
  let tagId = 0;
  const tagModel = () => ({
    query: () => ({
      findOne: async (ref: any) =>
        [...tags.values()].find((t) => t.referenceType === ref.referenceType && t.referenceId === ref.referenceId),
      insert: async (data: any) => {
        tagId += 1;
        tags.set(tagId, { id: tagId, ...data });
      },
      deleteById: async (id: number) => tags.delete(id),
      findById: (id: number) => ({ patch: async (data: any) => Object.assign(tags.get(id), data) }),
    }),
  });
  const accountModel = () => ({
    query: () => ({
      findById: async (id: number) =>
        ({ 1001: { id: 1001, accountType: 'cash', currencyCode: 'RUB' }, 1002: { id: 1002, accountType: 'bank', currencyCode: 'USD' } } as any)[id],
    }),
  });
  const dealModel = () => ({ query: () => ({ findById: async (id: number) => (id === 12 ? { id: 12 } : null) }) });
  const articleAccountModel = () => ({
    query: () => ({
      whereIn: async (_f: string, ids: number[]) =>
        ids.filter((id) => (options.articlesWithAccount ?? [10, 11]).includes(id)).map((articleId) => ({ articleId })),
    }),
  });
  const splits = {
    getSplits: async () => [],
    saveSplits: async (input: any, trx: any) => calls.saveSplits.push({ input, trx }),
    clearSplits: async (...args: any[]) => calls.clearSplits.push(args),
  };
  const gl = {
    revertJournalEntries: async (id: number, trx: any) => calls.revert.push([id, trx]),
    writeJournalEntries: async (id: number, trx: any) => calls.write.push([id, trx]),
  };
  const locking = {
    validateTransactionsLocking: async () => {
      if (options.locked) {
        const error: any = new Error('locked');
        error.errorType = 'TRANSACTIONS_DATE_LOCKED';
        throw error;
      }
    },
  };
  const uow = { withTransaction: async (fn: any, trx?: any) => fn(trx ?? 'tx') };
  const emitter = { emitAsync: async (event: string, payload: any) => calls.events.push([event, payload]) };

  const service = new TransactionActionsService(
    uow as any,
    emitter as any,
    gl as any,
    locking as any,
    splits as any,
    opModel as any,
    ledgerModel as any,
    tagModel as any,
    accountModel as any,
    dealModel as any,
    articleAccountModel as any,
  );
  return { service, operations, tags, calls };
}

describe('действия с операцией из реестра', () => {
  it('метка: поставить, заменить, снять — одна строка на документ', async () => {
    const { service, tags, calls } = makeActions();
    await service.setTag('CashflowTransaction', 21, '  маркетинг ');
    expect([...tags.values()]).toEqual([
      { id: 1, referenceType: 'CashflowTransaction', referenceId: 21, tag: 'маркетинг' },
    ]);
    await service.setTag('CashflowTransaction', 21, 'реклама');
    expect([...tags.values()].map((t) => t.tag)).toEqual(['реклама']);
    await service.setTag('CashflowTransaction', 21, '');
    expect(tags.size).toBe(0);
    expect(calls.events.map((e: any) => e[1].tag)).toEqual(['маркетинг', 'реклама', null]);
  });

  it('метка документу, которого нет, — названная ошибка', async () => {
    const { service } = makeActions();
    await expect(service.setTag('CashflowTransaction', 99, 'x')).rejects.toMatchObject({
      errorType: 'TRANSACTION_ACTION_NOT_FOUND',
    });
  });

  it('сделка: направление операции и проводки переписаны в одной транзакции', async () => {
    const { service, operations, calls } = makeActions();
    await service.linkDeal(21, 12);
    expect(operations.get(21).projectId).toBe(12);
    expect(calls.revert).toEqual([[21, 'tx']]);
    expect(calls.write).toEqual([[21, 'tx']]);
    await expect(service.linkDeal(21, 77)).rejects.toMatchObject({
      errorType: 'TRANSACTION_ACTION_DEAL_NOT_FOUND',
    });
  });

  it('операция из корзины — ни сделки, ни перевода', async () => {
    const { service } = makeActions();
    await expect(service.linkDeal(22, 12)).rejects.toMatchObject({ errorType: 'TRANSACTION_ACTION_NOT_FOUND' });
    await expect(service.convertToTransfer(22, 1001)).rejects.toMatchObject({
      errorType: 'TRANSACTION_ACTION_NOT_FOUND',
    });
  });

  it('перевод: вид и встречный счёт сменились, проводки переписаны; другая валюта — отказ словами', async () => {
    const { service, operations, calls } = makeActions();
    await expect(service.convertToTransfer(21, 1002)).rejects.toMatchObject({
      errorType: 'TRANSACTION_TRANSFER_CURRENCY_MISMATCH',
      message: 'Перевод возможен только между счетами одной валюты',
    });
    await service.convertToTransfer(21, 1001);
    expect(operations.get(21)).toMatchObject({ transactionType: 'TransferToAccount', creditAccountId: 1001 });
    expect(calls.write).toEqual([[21, 'tx']]);
  });

  it('закрытый период: сделку не привязать', async () => {
    const { service } = makeActions({ locked: true });
    await expect(service.linkDeal(21, 12)).rejects.toMatchObject({ errorType: 'TRANSACTIONS_DATE_LOCKED' });
  });

  it('разбиение пишется под CashflowTransaction и переписывает проводки; пустое — снимает', async () => {
    const { service, calls } = makeActions();
    await service.setSplits(21, [
      { amount: 600, articleId: 10 },
      { amount: 400, articleId: 11 },
    ]);
    expect(calls.saveSplits[0].input).toMatchObject({
      referenceType: 'CashflowTransaction',
      referenceId: 21,
      parentAmount: 1000,
    });
    expect(calls.write).toEqual([[21, 'tx']]);
    await service.setSplits(21, []);
    expect(calls.clearSplits).toHaveLength(1);
  });

  it('часть без статьи или со статьёй без счёта — отказ: проводке некуда её положить', async () => {
    const { service } = makeActions({ articlesWithAccount: [10] });
    await expect(service.setSplits(21, [{ amount: 1000 } as any])).rejects.toMatchObject({
      errorType: 'TRANSACTION_SPLIT_WITHOUT_ARTICLE',
    });
    await expect(
      service.setSplits(21, [
        { amount: 600, articleId: 10 },
        { amount: 400, articleId: 11 },
      ]),
    ).rejects.toMatchObject({ errorType: 'TRANSACTION_SPLIT_ARTICLE_WITHOUT_ACCOUNT' });
  });
});
