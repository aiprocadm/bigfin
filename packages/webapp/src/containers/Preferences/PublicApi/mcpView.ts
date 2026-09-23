// © 2026 Bigfin
/**
 * Экран «MCP-сервер для ИИ-агентов» (FT-090 ТЗ-3): чистые функции.
 *
 * Токен в настройках — заглушка `bgf_…`: сам токен показывается один раз при
 * выпуске и больше нигде не хранится, поэтому вставить его за человека нельзя.
 */
export interface McpToolRow {
  name: string;
  title?: string;
  description: string;
  _meta?: Record<string, unknown>;
}

export const TOKEN_PLACEHOLDER = 'bgf_YOUR_TOKEN';

export function mcpEndpoint(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/api/mcp`;
}

/** Какое право токена нужно инструменту (сервер кладёт его в `_meta`). */
export function toolScope(tool: McpToolRow): string | null {
  const scope = tool._meta?.['bigfin/scope'];
  return typeof scope === 'string' ? scope : null;
}

/** Доступен ли инструмент выбранному токену. Токен не выбран — не знаем. */
export function toolAvailable(tool: McpToolRow, tokenScopes: string[] | null): boolean | null {
  if (!tokenScopes) return null;
  const scope = toolScope(tool);
  return scope ? tokenScopes.includes(scope) : true;
}

/**
 * Настройка Claude Desktop через мост `mcp-remote`: Desktop говорит с
 * программами по stdio, мост переводит это в HTTP к нашему серверу. Токен —
 * в переменной окружения, а не в строке аргументов: так он не попадёт в
 * список процессов и в снимок экрана с настройками.
 */
export function claudeDesktopConfig(endpoint: string, organizationId: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        bigfin: {
          command: 'npx',
          args: [
            '-y',
            'mcp-remote',
            endpoint,
            '--header',
            'Authorization:${BIGFIN_AUTH}',
            '--header',
            `organization-id:${organizationId}`,
          ],
          env: { BIGFIN_AUTH: `Bearer ${TOKEN_PLACEHOLDER}` },
        },
      },
    },
    null,
    2,
  );
}

/** Подключение агентов, которые сами умеют MCP по HTTP (Claude Code и др.). */
export function httpAddCommand(endpoint: string, organizationId: string): string {
  return [
    `claude mcp add --transport http bigfin ${endpoint}`,
    `  --header "Authorization: Bearer ${TOKEN_PLACEHOLDER}"`,
    `  --header "organization-id: ${organizationId}"`,
  ].join(' \\\n');
}
