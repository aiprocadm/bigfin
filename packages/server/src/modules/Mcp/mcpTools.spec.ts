// © 2026 Bigfin
import * as fs from 'fs';
import * as path from 'path';
import { activeCode } from '../../testing/activeCode';
import { buildToolRequest, MCP_TOOLS } from './utils/mcpTools';
import { handleRpcBody, handleRpcMessage, McpHandlers } from './utils/mcpProtocol';
import { McpRateLimiter } from './utils/mcpRateLimit';
import { McpService } from './Mcp.service';

/**
 * FT-090 ТЗ-3: MCP-сервер для ИИ-агентов.
 * Сторожа из ТЗ: mcpToolsMirrorApi, mcpScopes, mcpReadOnly — здесь, в одном
 * файле: они проверяют один и тот же список инструментов.
 */
const MODULES = path.resolve(__dirname, '..');

const controllerFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return controllerFiles(full);
    return entry.name.endsWith('.controller.ts') ? [full] : [];
  });

const clean = (p: string) => p.replace(/^\/+|\/+$/g, '');

/** Найти GET-ручку по пути и вернуть право токена на ней (метод или класс). */
function scopeOfGetRoute(endpoint: string): { found: boolean; scope: string | null } {
  for (const file of controllerFiles(MODULES)) {
    const code = activeCode(fs.readFileSync(file, 'utf8'));
    const base = clean(code.match(/@Controller\(\s*['"`]([^'"`]*)['"`]/)?.[1] ?? '');
    if (!endpoint.startsWith(base)) continue;
    const classPart = code.slice(0, code.indexOf('export class'));
    const classScope = classPart.match(/@RequireApiScope\('([^']+)'\)/)?.[1] ?? null;
    // Блоки «декораторы + ручка»: делим по началу метода класса.
    const blocks = code.slice(code.indexOf('export class')).split(/\n  (?:async )?[a-zA-Z0-9_]+\([^)]*\)[^{;]*\{/);
    for (const block of blocks) {
      for (const m of block.matchAll(/@Get\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g)) {
        const full = [base, clean(m[1] ?? '')].filter(Boolean).join('/');
        if (full === endpoint) {
          const own = block.match(/@RequireApiScope\('([^']+)'\)/)?.[1] ?? null;
          return { found: true, scope: own ?? classScope };
        }
      }
    }
  }
  return { found: false, scope: null };
}

describe('mcpToolsMirrorApi: каждый инструмент — существующая ручка', () => {
  it('восемь инструментов из таблицы ТЗ', () => {
    expect(MCP_TOOLS.map((t) => t.name).sort()).toEqual(
      [
        'get_articles',
        'get_balance_sheet',
        'get_budget_plan_fact',
        'get_cash_flow',
        'get_cash_gaps',
        'get_debts',
        'get_managerial_pnl',
        'list_transactions',
      ].sort(),
    );
  });

  it.each(MCP_TOOLS.map((t) => [t.name, t] as const))('%s зовёт существующую GET-ручку', (_name, tool) => {
    expect(scopeOfGetRoute(tool.endpoint).found).toBe(true);
  });

  it('несуществующая ручка ловится (проверка самого сторожа)', () => {
    expect(scopeOfGetRoute('reports/no-such-report').found).toBe(false);
  });
});

describe('mcpScopes: права токена', () => {
  it.each(MCP_TOOLS.map((t) => [t.name, t] as const))('%s: ручка требует то же право, что заявлено', (_name, tool) => {
    expect(scopeOfGetRoute(tool.endpoint).scope).toBe(tool.scope);
  });

  it('AC 2: отказ ручки агент получает понятным текстом, сервер не падает', async () => {
    const original = (globalThis as any).fetch;
    (globalThis as any).fetch = async () => ({
      ok: false,
      status: 403,
      text: async () =>
        JSON.stringify({ errors: [{ type: 'API_SCOPE_MISSING', message: 'У токена нет права «reports:read»' }] }),
    });
    try {
      const answer: any = await new McpService().handle(
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_cash_flow', arguments: {} } },
        { authorization: 'Bearer bgf_x', organizationId: 'org' },
      );
      expect(answer.result.isError).toBe(true);
      expect(answer.result.content[0].text).toContain('У токена нет права «reports:read»');
    } finally {
      (globalThis as any).fetch = original;
    }
  });
});

describe('mcpReadOnly: ни одного пишущего инструмента', () => {
  it('все инструменты — GET', () => {
    expect(MCP_TOOLS.every((t) => t.method === 'GET')).toBe(true);
  });

  it('служба зовёт ручки только методом GET', () => {
    const source = activeCode(fs.readFileSync(path.join(__dirname, 'Mcp.service.ts'), 'utf8'));
    const methods = [...source.matchAll(/method:\s*'(\w+)'/g)].map((m) => m[1]);
    expect(methods).toEqual(['GET']);
  });
});

describe('вызов инструмента', () => {
  const original = (globalThis as any).fetch;
  afterEach(() => ((globalThis as any).fetch = original));

  it('AC 1: тот же адрес, что у экрана, тот же токен; в ответе meta с периодом и валютой', async () => {
    let called: any;
    (globalThis as any).fetch = async (url: string, init: any) => {
      called = { url, init };
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { total: 1 }, meta: { base_currency: 'RUB', legal_entity_scope: { is_consolidated: true } } }),
      };
    };
    const answer: any = await new McpService().handle(
      {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'get_cash_flow', arguments: { fromDate: '2026-08-01', toDate: '2026-08-31', legalEntityIds: [2] } },
      },
      { authorization: 'Bearer bgf_abc', organizationId: 'org-1' },
    );
    expect(called.url).toMatch(/\/api\/reports\/cash-flow-articles\?fromDate=2026-08-01&toDate=2026-08-31&legalEntityIds%5B%5D=2$/);
    expect(called.init).toMatchObject({ method: 'GET', headers: { authorization: 'Bearer bgf_abc', 'organization-id': 'org-1', accept: 'application/json' } });
    const payload = answer.result.structuredContent;
    expect(payload.meta).toMatchObject({
      tool: 'get_cash_flow',
      period: { fromDate: '2026-08-01', toDate: '2026-08-31' },
      legalEntities: [2],
      currency: 'RUB',
    });
    expect(payload.meta.computedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(payload.data).toEqual({ data: { total: 1 }, meta: expect.any(Object) });
  });

  it('без дат — прошлый месяц, и это видно в meta', () => {
    const built: any = buildToolRequest(MCP_TOOLS.find((t) => t.name === 'get_cash_flow')!, {});
    expect(built.period.fromDate).toMatch(/-01$/);
    expect(built.query.get('fromDate')).toBe(built.period.fromDate);
  });

  it('номер бюджета — в путь, обязательный параметр проверяется', () => {
    const tool = MCP_TOOLS.find((t) => t.name === 'get_budget_plan_fact')!;
    expect((buildToolRequest(tool, {}) as any).error).toContain('id');
    expect((buildToolRequest(tool, { id: 5 }) as any).path).toBe('budgets/5/plan-fact');
  });

  it('неверные аргументы — понятная ошибка, а не запрос наугад', () => {
    const tool = MCP_TOOLS.find((t) => t.name === 'get_cash_flow')!;
    expect((buildToolRequest(tool, { fromDate: '01.08.2026' }) as any).error).toContain('ГГГГ-ММ-ДД');
    expect((buildToolRequest(tool, { period: 'x' }) as any).error).toContain('нет параметра');
    expect((buildToolRequest(tool, { dateGroup: 'decade' }) as any).error).toContain('одно из');
  });

  it('лимит 60 вызовов в минуту на токен', () => {
    let now = 0;
    const limiter = new McpRateLimiter(60, () => now);
    for (let i = 0; i < 60; i++) expect(limiter.take('a')).toBe(true);
    expect(limiter.take('a')).toBe(false);
    expect(limiter.take('b')).toBe(true);
    now += 60_001;
    expect(limiter.take('a')).toBe(true);
  });
});

describe('протокол', () => {
  const handlers: McpHandlers = {
    listTools: () => [{ name: 'x', description: 'x', inputSchema: { type: 'object' } }],
    callTool: async () => {
      throw new Error('сломалось');
    },
  };

  it('знакомство: версия протокола, имя сервера, инструменты', async () => {
    const init: any = await handleRpcMessage(
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } },
      handlers,
    );
    expect(init.result).toMatchObject({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'bigfin' } });
    const list: any = await handleRpcMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, handlers);
    expect(list.result.tools).toHaveLength(1);
  });

  it('уведомление — без ответа; неизвестный метод — ошибка протокола', async () => {
    expect(await handleRpcMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, handlers)).toBeUndefined();
    const unknown: any = await handleRpcMessage({ jsonrpc: '2.0', id: 3, method: 'resources/list' }, handlers);
    expect(unknown.error.code).toBe(-32601);
  });

  it('AC 3: несуществующий инструмент и сбой инструмента не роняют сервер', async () => {
    const service = new McpService();
    const missing: any = await service.handle(
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'delete_everything' } },
      {},
    );
    expect(missing.result.isError).toBe(true);
    expect(missing.result.content[0].text).toContain('нет');
    const broken: any = await handleRpcMessage(
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'x', arguments: {} } },
      handlers,
    );
    expect(broken.result.isError).toBe(true);
  });

  it('пачка сообщений и мусор вместо запроса', async () => {
    const batch: any = await handleRpcBody(
      [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
      ],
      handlers,
    );
    expect(batch).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }]);
    const junk: any = await handleRpcBody('привет', handlers);
    expect(junk.error.code).toBe(-32600);
  });
});
