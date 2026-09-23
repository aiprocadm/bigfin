// © 2026 Bigfin
import { WebhookDispatcherService } from './WebhookDispatcher.service';
import { verifySignature } from './utils/webhooks';

/**
 * FT-092 ТЗ-3: отправка вебхуков. До этапа 39 подписки были, а отправки
 * не было вовсе.
 */
function makeDispatcher(webhook: any, delivery: any = null) {
  const queued: any[] = [];
  const patches: any[] = [];
  const inserted: any[] = [];
  const queue = { add: async (name: string, data: any, opts: any) => queued.push({ name, data, opts }) };
  const cls = { get: (key: string) => ({ organizationId: 'org-7', userId: 11 } as any)[key] };
  const chain = (rows: any[]) => {
    const q: any = { where: () => q, then: (resolve: any) => resolve(rows) };
    return q;
  };
  const webhookModel = () => ({
    query: () => ({ ...chain(webhook ? [webhook] : []), findById: async () => webhook }),
  });
  const deliveryModel = () => ({
    query: () => ({
      insert: async (data: any) => {
        inserted.push(data);
        return { id: 55, ...data };
      },
      findById: (id: number) => {
        const p: any = Promise.resolve(delivery);
        p.patch = async (data: any) => patches.push({ id, ...data });
        return p;
      },
    }),
  });
  const service = new WebhookDispatcherService(queue as any, cls as any, webhookModel as any, deliveryModel as any);
  return { service, queued, patches, inserted };
}

const hook = { id: 3, event: 'transaction.created', url: 'https://hooks.example.org/in', secret: 'секрет', active: true };

describe('отправка вебхуков', () => {
  const originalFetch = (globalThis as any).fetch;
  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  it('событие — запись в журнале доставок и задача в очереди', async () => {
    const { service, inserted, queued } = makeDispatcher(hook);
    expect(await service.dispatch('transaction.created', { id: 7 })).toBe(1);
    expect(inserted[0]).toMatchObject({ webhookId: 3, event: 'transaction.created', attempts: 0 });
    expect(JSON.parse(inserted[0].payload)).toMatchObject({ event: 'transaction.created', organizationId: 'org-7', data: { id: 7 } });
    expect(queued[0]).toMatchObject({ name: 'deliver', data: { deliveryId: 55, organizationId: 'org-7' } });
  });

  it('нет подписок — ничего не пишется и не ставится', async () => {
    const { service, inserted, queued } = makeDispatcher(null);
    expect(await service.dispatch('transaction.created', { id: 7 })).toBe(0);
    expect([inserted, queued]).toEqual([[], []]);
  });

  it('AC 4: подписчик получает POST с подписью, которая проверяется', async () => {
    const payload = JSON.stringify({ event: 'transaction.created', data: { id: 7 } });
    const { service, patches } = makeDispatcher(hook, { id: 55, webhookId: 3, event: 'transaction.created', payload, attempts: 0 });
    let received: any;
    (globalThis as any).fetch = async (url: string, init: any) => {
      received = { url, ...init };
      return { status: 200 };
    };
    await service.deliver(55);
    const headers = received.headers;
    expect(headers['X-Bigfin-Event']).toBe('transaction.created');
    expect(verifySignature(received.body, 'секрет', Number(headers['X-Bigfin-Timestamp']), headers['X-Bigfin-Signature'])).toBe(true);
    expect(patches[0]).toMatchObject({ attempts: 1, statusCode: 200, error: null, nextAttemptAt: null });
    expect(patches[0].deliveredAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('AC 5: 500 — повтор через 30 с новой задачей; выключенная подписка — без повтора', async () => {
    const failing = makeDispatcher(hook, { id: 55, webhookId: 3, event: 'x', payload: '{}', attempts: 0 });
    (globalThis as any).fetch = async () => ({ status: 503 });
    await failing.service.deliver(55);
    expect(failing.patches[0]).toMatchObject({ attempts: 1, statusCode: 503, deliveredAt: null });
    expect(failing.queued[0]).toMatchObject({ name: 'deliver', opts: { delay: 30_000 } });

    const off = makeDispatcher({ ...hook, active: false }, { id: 56, webhookId: 3, event: 'x', payload: '{}', attempts: 0 });
    await off.service.deliver(56);
    expect(off.patches[0]).toMatchObject({ error: 'Подписка удалена или выключена', nextAttemptAt: null });
    expect(off.queued).toEqual([]);
  });
});
