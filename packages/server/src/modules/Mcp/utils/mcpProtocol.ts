// © 2026 Bigfin
/**
 * Протокол MCP (Model Context Protocol) — ровно то, что нужно серверу только
 * для чтения (FT-090 ТЗ-3).
 *
 * MCP — это JSON-RPC 2.0: агент шлёт `{ jsonrpc, id, method, params }`, сервер
 * отвечает `{ jsonrpc, id, result }` или `{ jsonrpc, id, error }`. Сообщения
 * без `id` — уведомления, на них не отвечают.
 *
 * Своя реализация, а не библиотека: нужны четыре метода, а новая зависимость
 * означала бы перестройку файла блокировок всего монорепо ради них.
 */

export const MCP_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
export const SERVER_INFO = { name: 'bigfin', title: 'Bigfin', version: '1.0.0' };

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: any;
}

export interface McpToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: unknown;
  isError?: boolean;
}

export interface McpHandlers {
  listTools: () => { name: string; title?: string; description: string; inputSchema: object }[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<McpToolResult>;
}

export const RPC_ERRORS = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
};

const reply = (id: JsonRpcRequest['id'], result: unknown) => ({ jsonrpc: '2.0', id, result });
const fail = (id: JsonRpcRequest['id'], code: number, message: string) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});

/**
 * Ответ на одно сообщение. `undefined` — уведомление, отвечать не нужно.
 *
 * Ни одна ошибка не роняет сервер (AC 3): неизвестный метод — ошибка
 * протокола, неизвестный инструмент или отказ ручки — результат с
 * `isError`, который агент прочитает и поймёт.
 */
export async function handleRpcMessage(
  message: JsonRpcRequest,
  handlers: McpHandlers,
): Promise<object | undefined> {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0' || typeof message.method !== 'string') {
    return fail(message?.id, RPC_ERRORS.INVALID_REQUEST, 'Ожидается запрос JSON-RPC 2.0');
  }
  const isNotification = message.id === undefined;
  if (isNotification) return undefined;

  switch (message.method) {
    case 'initialize': {
      const asked = message.params?.protocolVersion;
      const protocolVersion = MCP_PROTOCOL_VERSIONS.includes(asked) ? asked : MCP_PROTOCOL_VERSIONS[0];
      return reply(message.id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'Bigfin — управленческий учёт. Инструменты только читают данные организации, к которой выпущен токен. ' +
          'Каждый ответ содержит meta: период, фильтры, юрлица, валюту и время расчёта — опирайтесь на них, а не на догадки.',
      });
    }
    case 'ping':
      return reply(message.id, {});
    case 'tools/list':
      return reply(message.id, { tools: handlers.listTools() });
    case 'tools/call': {
      const name = message.params?.name;
      if (typeof name !== 'string') {
        return fail(message.id, RPC_ERRORS.INVALID_PARAMS, 'Не указано имя инструмента');
      }
      const args = message.params?.arguments;
      const safeArgs = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
      try {
        return reply(message.id, await handlers.callTool(name, safeArgs));
      } catch (error: any) {
        return reply(message.id, toolError(`Инструмент «${name}» не выполнен: ${error?.message ?? 'ошибка'}`));
      }
    }
    default:
      return fail(message.id, RPC_ERRORS.METHOD_NOT_FOUND, `Метод «${message.method}» не поддерживается`);
  }
}

/** Пачка сообщений или одно — ответ той же формы (JSON-RPC batch). */
export async function handleRpcBody(body: unknown, handlers: McpHandlers): Promise<object | object[] | undefined> {
  if (Array.isArray(body)) {
    if (body.length === 0) return fail(null, RPC_ERRORS.INVALID_REQUEST, 'Пустая пачка сообщений');
    const answers = [];
    for (const message of body) {
      const answer = await handleRpcMessage(message, handlers);
      if (answer) answers.push(answer);
    }
    return answers.length ? answers : undefined;
  }
  return handleRpcMessage(body as JsonRpcRequest, handlers);
}

export function toolError(text: string): McpToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

export function toolResult(payload: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    structuredContent: payload,
  };
}
