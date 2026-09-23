import { describe, expect, it } from 'vitest';
import {
  claudeDesktopConfig,
  httpAddCommand,
  mcpEndpoint,
  toolAvailable,
  toolScope,
  TOKEN_PLACEHOLDER,
} from './mcpView';

/** FT-090 ТЗ-3: экран «MCP-сервер для ИИ-агентов». */
describe('экран MCP-сервера', () => {
  const cashFlow = { name: 'get_cash_flow', description: '', _meta: { 'bigfin/scope': 'reports:read' } };

  it('адрес — на этом же сервере', () => {
    expect(mcpEndpoint('https://app.bigfin.ru/')).toBe('https://app.bigfin.ru/api/mcp');
  });

  it('доступность инструмента — по правам выбранного токена', () => {
    expect(toolScope(cashFlow)).toBe('reports:read');
    expect(toolAvailable(cashFlow, ['reports:read'])).toBe(true);
    expect(toolAvailable(cashFlow, ['transactions:read'])).toBe(false);
    expect(toolAvailable(cashFlow, null)).toBeNull();
  });

  it('настройка Claude Desktop: мост mcp-remote, токен — в переменной окружения', () => {
    const config = JSON.parse(claudeDesktopConfig('https://x.ru/api/mcp', 'org-1'));
    const server = config.mcpServers.bigfin;
    expect(server.args).toContain('https://x.ru/api/mcp');
    expect(server.args).toContain('organization-id:org-1');
    expect(server.args.join(' ')).not.toContain(TOKEN_PLACEHOLDER);
    expect(server.env.BIGFIN_AUTH).toBe(`Bearer ${TOKEN_PLACEHOLDER}`);
  });

  it('команда для агентов с MCP по HTTP', () => {
    const command = httpAddCommand('https://x.ru/api/mcp', 'org-1');
    expect(command).toContain('--transport http bigfin https://x.ru/api/mcp');
    expect(command).toContain('organization-id: org-1');
  });
});
