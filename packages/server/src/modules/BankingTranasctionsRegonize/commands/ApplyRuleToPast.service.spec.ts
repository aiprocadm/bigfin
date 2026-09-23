// © 2026 Bigfin
import { ApplyRuleToPastService } from './ApplyRuleToPast.service';

/**
 * «Применить к прошлым операциям» (FT-034 ТЗ-3). Критерии приёмки:
 * (1) предпросмотр — ровно подходящие строки; (2) снятая галочка исключает
 * строку; (3) итог приходит уведомлением.
 */
const RULE = {
  id: 7,
  name: 'Озон',
  ruleType: 'assign',
  assignAccountId: 1021,
  conditionsType: 'and',
  conditions: [
    { field: 'description', comparator: 'contains', value: 'озон' },
    { field: 'amount', comparator: 'bigger', value: '1000' },
  ],
  splits: [],
};

function makeService(rows: any[]) {
  const store = new Map(rows.map((r) => [r.id, { ...r }]));
  const applied: number[] = [];
  const notifications: any[] = [];
  const queued: any[] = [];

  const chain = (list: any[]) => {
    const q: any = {
      modify: () => q,
      onBuild: () => q,
      orderBy: () => q,
      then: (res: any, rej: any) => Promise.resolve(list).then(res, rej),
    };
    return q;
  };
  const uncategorized = () => ({
    query: () => ({
      ...chain([...store.values()].filter((r) => !r.categorized && !r.excludedAt)),
      findById: (id: number) => {
        const found = store.get(id);
        const p: any = Promise.resolve(found);
        p.patch = async (data: any) => Object.assign(found, data);
        return p;
      },
    }),
  });
  const rules = () => ({
    query: () => {
      const q: any = {
        findById: () => q,
        withGraphFetched: () => q,
        throwIfNotFound: async () => RULE,
      };
      return q;
    },
  });
  let nextId = 1;
  const recognized = () => ({
    query: () => ({
      insert: async () => ({ id: nextId++ }),
      deleteById: async () => undefined,
    }),
  });
  const notificationModel = () => ({
    query: () => ({ insert: async (data: any) => notifications.push(data) }),
  });
  const applier = {
    apply: async (_rule: any, row: any) => {
      applied.push(row.id);
      store.get(row.id)!.categorized = true;
      return { uncategorizedTransactionId: row.id, status: 'applied' };
    },
  };
  const tenancy = { getTenantJobPayload: async () => ({ organizationId: 'org', userId: 1 }) };
  const queue = { add: async (name: string, data: any) => (queued.push({ name, data }), { id: 'j1' }) };

  const service = new ApplyRuleToPastService(
    applier as any,
    tenancy as any,
    queue as any,
    rules as any,
    uncategorized as any,
    recognized as any,
    notificationModel as any,
  );
  return { service, store, applied, notifications, queued };
}

const row = (id: number, amount: number, description: string, extra: Record<string, any> = {}) => ({
  id,
  amount,
  description,
  accountId: 1000,
  ...extra,
});

describe('применить правило к прошлым операциям', () => {
  const rows = [
    row(1, -1500, 'Оплата ОЗОН'),
    row(2, -500, 'Оплата ОЗОН'), // сумма мала
    row(3, -2500, 'Wildberries'), // не то описание
    row(4, -3000, 'Озон маркет'),
    row(5, -9000, 'Озон', { categorized: true }), // уже разнесена
    row(6, -9000, 'Озон', { excludedAt: '2026-01-01' }), // исключена
  ];

  it('(1) предпросмотр — ровно подходящие неразнесённые строки', async () => {
    const { service } = makeService(rows);
    const preview = await service.preview(7);
    expect(preview.total).toBe(2);
    expect(preview.ids.sort()).toEqual([1, 4]);
  });

  it('(2) снятая галочка исключает строку; (3) итог — уведомлением', async () => {
    const { service, applied, notifications } = makeService(rows);
    await service.run(7, [1]);
    expect(applied).toEqual([1]);
    expect(notifications).toHaveLength(1);
    expect(JSON.parse(notifications[0].payload)).toMatchObject({ applied: 1, skipped: 0, ruleName: 'Озон' });
  });

  it('перед разноской строка перепроверяется: разнесённая руками и изменившаяся — пропуск', async () => {
    const { service, store, applied, notifications } = makeService(rows);
    store.get(1)!.categorized = true; // разнесли руками, пока задача ждала
    store.get(4)!.description = 'Аренда'; // описание поправили
    const outcomes = await service.run(7, [1, 4, 999]);
    expect(applied).toEqual([]);
    expect(outcomes.map((o) => o.reason)).toEqual(['already_categorized', 'no_longer_matches', 'not_found']);
    expect(JSON.parse(notifications[0].payload)).toMatchObject({ applied: 0, skipped: 3 });
  });

  it('постановка в очередь: пустой выбор — отказ, повторы убраны', async () => {
    const { service, queued } = makeService(rows);
    await expect(service.queueApply(7, [])).rejects.toMatchObject({
      errorType: 'BANK_RULE_APPLY_NOTHING_SELECTED',
    });
    const result = await service.queueApply(7, [1, 1, 4]);
    expect(result).toEqual({ queued: 2, jobId: 'j1' });
    expect(queued[0].data).toMatchObject({ ruleId: 7, ids: [1, 4], organizationId: 'org' });
  });
});
