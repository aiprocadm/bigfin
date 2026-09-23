// © 2026 Bigfin
import { ImportBatchesService } from './ImportBatches.service';

/**
 * Пакеты импорта и откат (FT-043 ТЗ-3) на подделках.
 */
function makeBatches(lines: any[], batch: any = { id: 5, rolledBackAt: null }) {
  const store = new Map(lines.map((r) => [r.id, { ...r }]));
  const batches = new Map<number, any>([[batch.id, { ...batch }]]);
  const calls: any = { trashed: [], deleted: [], closed: [] };

  const uncategorizedModel = () => ({
    query: () => {
      const filters: Array<(r: any) => boolean> = [];
      const q: any = {
        findOne: async (where: any) =>
          [...store.values()].find((r) => Object.entries(where).every(([k, v]) => r[k] === v)),
        deleteById: async (id: number) => {
          calls.deleted.push(id);
          store.delete(id);
        },
        where: (field: string, value: any) => {
          filters.push((r) => r[field] === value);
          return q;
        },
        whereNull: (field: string) => {
          filters.push((r) => r[field] == null);
          return q;
        },
        select: async () => [...store.values()].filter((r) => filters.every((f) => f(r))),
      };
      return q;
    },
  });
  const batchModel = () => ({
    query: () => ({
      findById: (id: number) => {
        const p: any = Promise.resolve(batches.get(id));
        p.patch = async (data: any) => Object.assign(batches.get(id), data);
        return p;
      },
      deleteById: async (id: number) => {
        calls.closed.push(['deleted', id]);
        batches.delete(id);
      },
      insert: async () => ({ id: 99 }),
    }),
  });
  const trash = {
    trash: async (items: any[], reason: string, trx: any) => {
      calls.trashed.push({ items, reason, trx });
      return { trashed: items.length };
    },
  };
  const uow = { withTransaction: async (fn: any) => fn('tx') };
  const service = new ImportBatchesService(
    uow as any,
    { get: () => 7 } as any,
    trash as any,
    batchModel as any,
    uncategorizedModel as any,
  );
  return { service, store, batches, calls };
}

describe('пакеты импорта (FT-043)', () => {
  const rows = [
    { id: 1, accountId: 1000, externalId: 'a', importBatchId: 5, deletedAt: null },
    { id: 2, accountId: 1000, externalId: 'b', importBatchId: 5, deletedAt: null, categorized: true },
    { id: 3, accountId: 1000, externalId: 'old', deletedAt: '2026-09-01', deleteReason: 'import_rollback' },
    { id: 4, accountId: 1000, externalId: 'mine', deletedAt: '2026-09-01', deleteReason: 'manual' },
  ];

  it('дубль: живая строка — дубль; удалённая откатом — заменяется; удалённая вручную — остаётся дублем', async () => {
    const { service, calls } = makeBatches(rows);
    expect(await service.isDuplicate(1000, 'a')).toBe(true);
    expect(await service.isDuplicate(1000, 'old')).toBe(false);
    expect(calls.deleted).toEqual([3]);
    expect(await service.isDuplicate(1000, 'mine')).toBe(true);
    expect(await service.isDuplicate(1000, 'new')).toBe(false);
  });

  it('предпросмотр ничего не удаляет', async () => {
    const { service, calls } = makeBatches(rows);
    expect(await service.isDuplicate(1000, 'old', undefined, { purge: false })).toBe(false);
    expect(calls.deleted).toEqual([]);
  });

  it('откат: все живые строки пакета — в корзину одной транзакцией, пакет помечен', async () => {
    const { service, batches, calls } = makeBatches(rows);
    const result = await service.rollback(5);
    expect(result).toEqual({ batchId: 5, trashed: 2 });
    expect(calls.trashed).toEqual([
      {
        items: [
          { kind: 'bank_line', id: 1 },
          { kind: 'bank_line', id: 2 },
        ],
        reason: 'import_rollback',
        trx: 'tx',
      },
    ]);
    expect(batches.get(5).rolledBackAt).toBeTruthy();
  });

  it('повторный откат отвергается с названной ошибкой', async () => {
    const { service } = makeBatches(rows, { id: 5, rolledBackAt: '2026-09-01' });
    await expect(service.rollback(5)).rejects.toMatchObject({
      errorType: 'IMPORT_BATCH_ALREADY_ROLLED_BACK',
    });
  });

  it('пустой пакет не остаётся в истории', async () => {
    const { service, batches } = makeBatches([]);
    await service.close(5, 0);
    expect(batches.has(5)).toBe(false);
  });
});
