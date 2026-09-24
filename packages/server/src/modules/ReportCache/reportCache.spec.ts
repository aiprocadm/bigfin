// © 2026 Bigfin
import { firstValueFrom, of } from 'rxjs';
import { events } from '@/common/events/events';
import { ReportCacheService } from './ReportCache.service';
import { ReportCacheInterceptor, withCachedAt } from './ReportCache.interceptor';
import { ReportCacheInvalidationSubscriber } from './ReportCacheInvalidation.subscriber';
import { ReportCacheStore } from './ReportCache.store';
import { IGNORED_GROUPS, INVALIDATING_GROUPS, invalidatingEventNames } from './utils/invalidationMap';
import {
  canonicalQuery,
  isCacheableAccept,
  mutationInvalidates,
  reportCacheKey,
  reportPathOf,
} from './utils/reportCacheKey';

/**
 * FT-093 ТЗ-3: кэш отчётов и «Пересобрать».
 */
class MemoryStore implements ReportCacheStore {
  data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
  async incr(key: string) {
    const next = Number(this.data.get(key) ?? 0) + 1;
    this.data.set(key, String(next));
    return next;
  }
  async del(key: string) {
    this.data.delete(key);
  }
}

const cls = (org = 'org-1', user = 7) => ({ get: (k: string) => ({ organizationId: org, userId: user } as any)[k], isActive: () => true }) as any;

function http(request: any) {
  const headers: Record<string, string> = {};
  const sent: string[] = [];
  const response: any = {
    statusCode: 200,
    setHeader: (k: string, v: string) => (headers[k] = v),
    getHeader: (k: string) => headers[k],
    send(body: string) {
      sent.push(body);
      return response;
    },
  };
  return {
    headers,
    sent,
    response,
    context: {
      getType: () => 'http',
      switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
    } as any,
  };
}

/**
 * Как Nest с Express: значение из цепочки превращается в строку и уходит
 * через `res.send`; строка (ответ из кэша) уходит как есть.
 */
async function reply(interceptor: ReportCacheInterceptor, request: any, handler: { handle: () => any }) {
  const call = http(request);
  const value = await firstValueFrom(interceptor.intercept(call.context, handler));
  call.response.send(typeof value === 'string' ? value : JSON.stringify(value));
  await new Promise((r) => setImmediate(r));
  return { ...call, body: JSON.parse(call.sent[0]) };
}

const report = (extra: any = {}) => ({
  method: 'GET',
  originalUrl: '/api/reports/cash-flow-articles?from_date=2026-08-01',
  query: { from_date: '2026-08-01', to_date: '2026-08-31' },
  headers: { accept: 'application/json', 'accept-language': 'ru' },
  ...extra,
});

describe('ключ и правила кэша', () => {
  it('кэшируются только отчёты и только JSON', () => {
    expect(reportPathOf('/api/reports/balance-sheet?x=1')).toBe('/api/reports/balance-sheet');
    expect(reportPathOf('/api/reports/cache/rebuild')).toBeNull();
    expect(reportPathOf('/api/banking/transactions')).toBeNull();
    expect(isCacheableAccept('application/json')).toBe(true);
    expect(isCacheableAccept('application/json+table')).toBe(true);
    expect(isCacheableAccept('application/xlsx')).toBe(false);
    expect(isCacheableAccept('application/pdf')).toBe(false);
  });

  it('порядок параметров не важен; пользователь, язык, формат и поколение — важны', () => {
    expect(canonicalQuery({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(canonicalQuery({ a: [2, { c: 2, d: 1 }], b: 1 }));
    const base = { organizationId: 'o', generation: 1, viewerId: '7|', path: '/api/reports/x', query: { a: 1 }, accept: 'application/json', locale: 'ru' };
    const key = reportCacheKey(base);
    expect(key).toMatch(/^tenant:o:report:x:g1:[0-9a-f]{40}$/);
    for (const change of [{ viewerId: '8|' }, { viewerId: '7|6' }, { locale: 'en' }, { accept: 'application/json+table' }, { generation: 2 }, { query: { a: 2 } }]) {
      expect(reportCacheKey({ ...base, ...change })).not.toBe(key);
    }
  });

  it('изменяющий запрос сбрасывает кэш, настройки вида — нет', () => {
    expect(mutationInvalidates('POST', '/api/banking/transactions')).toBe(true);
    expect(mutationInvalidates('PUT', '/api/management-articles/5')).toBe(true);
    expect(mutationInvalidates('PUT', '/api/settings')).toBe(true);
    expect(mutationInvalidates('PUT', '/api/settings/display-preferences')).toBe(false);
    expect(mutationInvalidates('GET', '/api/banking/transactions')).toBe(false);
  });
});

describe('AC 4: карта инвалидации', () => {
  it('каждая группа событий решена: сбрасывает кэш или объяснена как не влияющая', () => {
    const decided = new Set<string>([...INVALIDATING_GROUPS, ...Object.keys(IGNORED_GROUPS)]);
    const undecided = Object.keys(events).filter((group) => !decided.has(group));
    expect(undecided).toEqual([]);
  });

  it('группа не может быть и там, и там', () => {
    expect(INVALIDATING_GROUPS.filter((g) => g in IGNORED_GROUPS)).toEqual([]);
  });

  it('создание, изменение и удаление операции — в карте', () => {
    const names = invalidatingEventNames();
    for (const name of [events.cashflow.onTransactionCreated, events.cashflow.onTransactionDeleted, events.saleInvoice.onCreated, events.bill.onEdited, events.manualJournals.onDeleted]) {
      expect(names).toContain(name);
    }
  });

  it('событие сбрасывает кэш организации — сразу и после записи транзакции', async () => {
    const store = new MemoryStore();
    const cache = new ReportCacheService(store);
    const on: Record<string, (p: any) => void> = {};
    const subscriber = new ReportCacheInvalidationSubscriber({ on: (n: string, f: any) => (on[n] = f) } as any, cache, cls());
    subscriber.onModuleInit();
    let commit!: () => void;
    const trx = { executionPromise: new Promise<void>((r) => (commit = r)) };
    await subscriber.onDataChanged({ trx });
    expect(await cache.generation('org-1')).toBe(1);
    commit();
    await trx.executionPromise;
    await new Promise((r) => setImmediate(r));
    expect(await cache.generation('org-1')).toBe(2);
    expect(Object.keys(on)).toContain(events.cashflow.onTransactionCreated);
  });
});

describe('перехватчик', () => {
  it('AC 1: второй такой же запрос отдаётся готовым текстом из кэша, отчёт не считается', async () => {
    const interceptor = new ReportCacheInterceptor(new ReportCacheService(new MemoryStore()), cls());
    let computed = 0;
    const handler = { handle: () => { computed += 1; return of({ data: { total: 42 }, meta: {} }); } };
    const first = await reply(interceptor, report(), handler);
    const second = await reply(interceptor, report(), handler);
    expect(computed).toBe(1);
    expect(first.body).toEqual({ data: { total: 42 }, meta: {} });
    expect(second.body).toMatchObject({ data: { total: 42 }, cached_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/) });
    expect(second.headers['x-bigfin-report-cached-at']).toBe(second.body.cached_at);
  });

  it('в кэш кладётся ТЕКСТ, ушедший человеку, — после всех преобразований', async () => {
    const store = new MemoryStore();
    const interceptor = new ReportCacheInterceptor(new ReportCacheService(store), cls());
    const call = http(report());
    await firstValueFrom(interceptor.intercept(call.context, { handle: () => of({ a: 1 }) }));
    // Общие преобразования сервера переименовали ключи — в кэш идёт итог.
    call.response.send('{"a_b":1}');
    await new Promise((r) => setImmediate(r));
    const [stored] = [...store.data.entries()].filter(([k]) => k.includes(':report:'));
    expect(stored[1].split('\n')[1]).toBe('{"a_b":1}');
  });

  it('ошибка и не-JSON в кэш не попадают', async () => {
    const store = new MemoryStore();
    const interceptor = new ReportCacheInterceptor(new ReportCacheService(store), cls());
    const failed = http(report());
    await firstValueFrom(interceptor.intercept(failed.context, { handle: () => of({}) }));
    failed.response.statusCode = 500;
    failed.response.send('{"error":1}');
    const pdf = http(report());
    await firstValueFrom(interceptor.intercept(pdf.context, { handle: () => of({}) }));
    pdf.headers['Content-Type'] = 'application/pdf';
    pdf.response.send('%PDF');
    await new Promise((r) => setImmediate(r));
    expect([...store.data.keys()].filter((k) => k.includes(':report:'))).toEqual([]);
  });

  it('cached_at вставляется в любой объект', () => {
    expect(JSON.parse(withCachedAt('{}', 'x'))).toEqual({ cached_at: 'x' });
    expect(JSON.parse(withCachedAt(' {"a":1}', 'x'))).toEqual({ cached_at: 'x', a: 1 });
    expect(withCachedAt('[1]', 'x')).toBe('[1]');
  });

  it('AC 2: изменяющий запрос сбрасывает кэш — следующий отчёт считается заново', async () => {
    const interceptor = new ReportCacheInterceptor(new ReportCacheService(new MemoryStore()), cls());
    let computed = 0;
    const handler = { handle: () => { computed += 1; return of({ data: computed }); } };
    await reply(interceptor, report(), handler);
    await firstValueFrom(
      interceptor.intercept(http({ method: 'POST', originalUrl: '/api/banking/transactions', headers: {} }).context, { handle: () => of({ id: 1 }) }),
    );
    await new Promise((r) => setImmediate(r));
    const again = await reply(interceptor, report(), handler);
    expect(computed).toBe(2);
    expect(again.body).toEqual({ data: 2 });
  });

  it('разные люди — разный кэш: сотрудник не получит цифры владельца', async () => {
    const store = new MemoryStore();
    const owner = new ReportCacheInterceptor(new ReportCacheService(store), cls('org-1', 1));
    const staff = new ReportCacheInterceptor(new ReportCacheService(store), cls('org-1', 2));
    await reply(owner, report(), { handle: () => of({ data: 'всё' }) });
    expect((await reply(staff, report(), { handle: () => of({ data: 'своё' }) })).body).toEqual({ data: 'своё' });
    const preview = await reply(owner, report({ headers: { accept: 'application/json', 'x-bigfin-access-preview': '6' } }), {
      handle: () => of({ data: 'глазами' }),
    });
    expect(preview.body).toEqual({ data: 'глазами' });
  });

  it('«Пересобрать» обходит кэш и перезаписывает его', async () => {
    const interceptor = new ReportCacheInterceptor(new ReportCacheService(new MemoryStore()), cls());
    let n = 0;
    const handler = { handle: () => of({ data: ++n }) };
    await reply(interceptor, report(), handler);
    const fresh = await reply(interceptor, report({ headers: { accept: 'application/json', 'accept-language': 'ru', 'x-bigfin-report-cache': 'refresh' } }), handler);
    expect(fresh.body).toEqual({ data: 2 });
    const cached = await reply(interceptor, report(), handler);
    expect(cached.body).toMatchObject({ data: 2 });
    expect(n).toBe(2);
  });

  it('Excel не кэшируется; без организации кэша нет', async () => {
    const interceptor = new ReportCacheInterceptor(new ReportCacheService(new MemoryStore()), cls());
    let n = 0;
    const handler = { handle: () => of({ data: ++n }) };
    const xlsx = report({ headers: { accept: 'application/xlsx' } });
    await reply(interceptor, xlsx, handler);
    await reply(interceptor, xlsx, handler);
    expect(n).toBe(2);
    const anon = new ReportCacheInterceptor(new ReportCacheService(new MemoryStore()), { get: () => undefined } as any);
    await reply(anon, report(), handler);
    await reply(anon, report(), handler);
    expect(n).toBe(4);
  });
});
