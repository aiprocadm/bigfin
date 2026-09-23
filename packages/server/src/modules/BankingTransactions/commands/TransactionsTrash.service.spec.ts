// © 2026 Bigfin
import { TransactionsTrashService } from './TransactionsTrash.service';

/**
 * Корзина операций (FT-042 ТЗ-3) на подделках: что снимается, что
 * помечается, что запрещено.
 */
function makeTrash(options: { locked?: boolean } = {}) {
  const cashflow = new Map<number, any>([
    [10, { id: 10, date: '2026-01-10', deletedAt: null }],
    [11, { id: 11, date: '2025-12-01', deletedAt: '2026-09-01 10:00:00' }],
  ]);
  const lines = new Map<number, any>([
    [1, { id: 1, accountId: 1000, categorized: true, categorizeRefType: 'CashflowTransaction', categorizeRefId: 10, deletedAt: null }],
    [2, { id: 2, accountId: 1000, categorized: false, excludedAt: null, deletedAt: null }],
    [3, { id: 3, accountId: 1000, categorized: false, excludedAt: '2026-01-01', deletedAt: null }],
    [4, { id: 4, accountId: 1000, categorized: true, categorizeRefType: 'CashflowTransaction', categorizeRefId: 11, deletedAt: '2026-09-01 10:00:00' }],
  ]);
  const calls: any = { revert: [], write: [], counter: [], hardDeleted: [] };

  const byIdQuery = (store: Map<number, any>) => (id: number) => {
    const p: any = Promise.resolve(store.get(id));
    p.patch = async (data: any) => Object.assign(store.get(id), data);
    p.delete = async () => {
      calls.hardDeleted.push(id);
      store.delete(id);
    };
    return p;
  };
  const whereChain = (store: Map<number, any>) => {
    const filters: Array<(r: any) => boolean> = [];
    const q: any = {
      where: (field: string, value: any) => {
        filters.push((r) => r[field] === value);
        return q;
      },
      whereNull: (field: string) => {
        filters.push((r) => r[field] == null);
        return q;
      },
      patch: async (data: any) =>
        [...store.values()].filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, data)),
      delete: async () =>
        [...store.values()].filter((r) => filters.every((f) => f(r))).forEach((r) => store.delete(r.id)),
    };
    return q;
  };
  const model = (store: Map<number, any>) => () => ({
    query: () => ({ findById: byIdQuery(store), ...whereChain(store) }),
  });
  const accountModel = () => ({
    query: () => ({
      findById: (id: number) => ({
        increment: async () => calls.counter.push([id, +1]),
        decrement: async () => calls.counter.push([id, -1]),
      }),
    }),
  });
  const uow = { withTransaction: async (fn: any, trx?: any) => fn(trx ?? 'tx') };
  const cls = { get: () => 7 };
  const gl = {
    revertJournalEntries: async (id: number) => calls.revert.push(id),
    writeJournalEntries: async (id: number) => calls.write.push(id),
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
  const deleteCashflow = {
    deleteCashflowTransaction: async (id: number, tx: any) => {
      calls.hardDeleted.push(`cashflow:${id}`);
      calls.deleteTx = tx;
      cashflow.delete(id);
    },
  };
  const service = new TransactionsTrashService(
    uow as any,
    cls as any,
    gl as any,
    locking as any,
    deleteCashflow as any,
    model(cashflow) as any,
    model(lines) as any,
    accountModel as any,
    (() => ({ query: () => ({ whereIn: async () => [] }) })) as any,
  );
  return { service, cashflow, lines, calls };
}

describe('корзина операций (FT-042)', () => {
  it('удаление операции снимает проводки и уносит её строку выписки', async () => {
    const { service, cashflow, lines, calls } = makeTrash();
    await service.trash([{ kind: 'cashflow', id: 10 }]);
    expect(cashflow.get(10)).toMatchObject({ deletedBy: 7, deleteReason: 'manual' });
    expect(cashflow.get(10).deletedAt).toBeTruthy();
    expect(calls.revert).toEqual([10]);
    expect(lines.get(1).deletedAt).toBeTruthy();
  });

  it('разнесённая строка выписки удаляется вместе со своей операцией', async () => {
    const { service, cashflow, calls } = makeTrash();
    await service.trash([{ kind: 'bank_line', id: 1 }], 'import_rollback');
    expect(cashflow.get(10).deleteReason).toBe('import_rollback');
    expect(calls.revert).toEqual([10]);
  });

  it('неразнесённая строка: счётчик «ждут разноски» уменьшается; исключённая — не трогает его', async () => {
    const { service, calls } = makeTrash();
    await service.trash([{ kind: 'bank_line', id: 2 }]);
    await service.trash([{ kind: 'bank_line', id: 3 }]);
    expect(calls.counter).toEqual([[1000, -1]]);
  });

  it('восстановление пересобирает проводки и возвращает строку; счётчик — обратно', async () => {
    const { service, cashflow, lines, calls } = makeTrash();
    await service.trash([{ kind: 'cashflow', id: 10 }, { kind: 'bank_line', id: 2 }]);
    await service.restore([{ kind: 'cashflow', id: 10 }, { kind: 'bank_line', id: 2 }]);
    expect(cashflow.get(10).deletedAt).toBeNull();
    expect(lines.get(1).deletedAt).toBeNull();
    expect(calls.write).toEqual([10]);
    expect(calls.counter).toEqual([[1000, -1], [1000, +1]]);
  });

  it('закрытый период: ни восстановить, ни удалить окончательно — ошибка названа', async () => {
    const { service } = makeTrash({ locked: true });
    await expect(service.restore([{ kind: 'cashflow', id: 11 }])).rejects.toMatchObject({
      errorType: 'TRANSACTIONS_DATE_LOCKED',
    });
    await expect(service.purge([{ kind: 'cashflow', id: 11 }])).rejects.toMatchObject({
      errorType: 'TRANSACTIONS_DATE_LOCKED',
    });
  });

  it('окончательно удаляется только лежащее в корзине', async () => {
    const { service, calls } = makeTrash();
    await expect(service.purge([{ kind: 'cashflow', id: 10 }])).rejects.toMatchObject({
      errorType: 'TRASH_ITEM_NOT_IN_TRASH',
    });
    await service.purge([{ kind: 'cashflow', id: 11 }]);
    expect(calls.hardDeleted).toContain('cashflow:11');
  });

  it('чужая транзакция (импорт): разнесённая строка стирается вместе с операцией внутри неё', async () => {
    const { service, calls, lines } = makeTrash();
    await service.purge([{ kind: 'bank_line', id: 4 }], 'import-trx' as any);
    expect(calls.hardDeleted).toContain('cashflow:11');
    expect(calls.deleteTx).toBe('import-trx');
    expect(lines.has(4)).toBe(false);
  });
});
