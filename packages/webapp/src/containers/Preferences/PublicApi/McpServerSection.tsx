// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { useMcpTools, type ApiTokenRow } from '@/hooks/query/publicApi';
import { useAuditLogsQuery } from '@/hooks/query/auditLogs';
import { useAuthOrganizationId } from '@/hooks/state';
import { useAbilityContext } from '@/hooks/utils';
import { cn } from '@/lib/cn';

import {
  claudeDesktopConfig,
  httpAddCommand,
  mcpEndpoint,
  toolAvailable,
  toolScope,
  type McpToolRow,
} from './mcpView';
import { tokenState } from './publicApiView';

/**
 * «MCP-сервер для ИИ-агентов» (FT-090 ТЗ-3): как подключить Claude, GPT или
 * другого агента, чтобы он читал финансы организации.
 *
 * Агент ходит теми же ручками, что и экран, тем же токеном — поэтому здесь
 * нет отдельных настроек прав: что умеет токен, то и доступно агенту.
 */
export function McpServerSection({ tokens }: { tokens: ApiTokenRow[] }) {
  const organizationId = String(useAuthOrganizationId() ?? '');
  const endpoint = mcpEndpoint(window.location.origin);
  const active = tokens.filter((token) => tokenState(token) === 'active');
  const [tokenId, setTokenId] = React.useState<number | null>(null);
  const selected = active.find((token) => token.id === tokenId) ?? null;

  const { data: tools } = useMcpTools() as { data?: McpToolRow[] };
  // Журнал вызовов живёт в журнале действий: без права на него не спрашиваем,
  // иначе ответ 403 закрыл бы весь экран.
  const canSeeJournal = useAbilityContext().can('View', 'AuditLog');
  const journal = useAuditLogsQuery(
    { action: 'mcp_tool_called', pageSize: 10 },
    { enabled: canSeeJournal },
  ) as {
    data?: { data?: any[] };
  };
  const calls = journal.data?.data ?? [];
  const tokenName = (id: unknown) =>
    tokens.find((token) => token.id === Number(id))?.name ?? intl.get('mcp.token_unknown');

  return (
    <section className="rounded-default border border-border p-4">
      <h2 className="text-sm font-medium text-text-primary">{intl.get('mcp.title')}</h2>
      <p className="mt-1 text-sm text-text-muted">{intl.get('mcp.hint')}</p>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
        <dt className="text-text-muted">{intl.get('mcp.address')}</dt>
        <dd className="break-all font-mono">{endpoint}</dd>
        <dt className="text-text-muted">{intl.get('mcp.organization')}</dt>
        <dd className="break-all font-mono">{organizationId}</dd>
      </dl>

      <label className="mt-4 flex flex-col gap-1 text-sm">
        <span className="text-text-muted">{intl.get('mcp.token')}</span>
        <select
          className="h-9 max-w-sm rounded-default border border-border bg-background px-2"
          value={tokenId ?? ''}
          onChange={(event) => setTokenId(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">{intl.get('mcp.token_none')}</option>
          {active.map((token) => (
            <option key={token.id} value={token.id}>
              {token.name} · …{token.lastFour}
            </option>
          ))}
        </select>
      </label>

      <h3 className="mt-4 text-sm font-medium text-text-primary">{intl.get('mcp.tools')}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {(tools ?? []).map((tool) => {
          const available = toolAvailable(tool, selected?.scopes ?? null);
          return (
            <li key={tool.name} className="flex flex-col gap-0.5 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <code className="font-mono">{tool.name}</code>
                <span className="text-text-primary">{tool.title}</span>
                {available !== null && (
                  <span
                    className={cn(
                      'rounded-default px-1.5 text-xs',
                      available ? 'bg-surface-elevated text-text-secondary' : 'bg-warning text-text-primary',
                    )}
                  >
                    {available
                      ? intl.get('mcp.tool_available')
                      : intl.get('mcp.tool_unavailable', { scope: toolScope(tool) ?? '' })}
                  </span>
                )}
              </span>
              <span className="text-text-muted">{tool.description}</span>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-4 text-sm font-medium text-text-primary">{intl.get('mcp.setup_claude_desktop')}</h3>
      <pre className="mt-2 overflow-x-auto rounded-default bg-surface-elevated p-3 text-xs">
        {claudeDesktopConfig(endpoint, organizationId)}
      </pre>
      <h3 className="mt-4 text-sm font-medium text-text-primary">{intl.get('mcp.setup_http')}</h3>
      <pre className="mt-2 overflow-x-auto rounded-default bg-surface-elevated p-3 text-xs">
        {httpAddCommand(endpoint, organizationId)}
      </pre>
      <p className="mt-2 text-xs text-text-muted">{intl.get('mcp.token_note')}</p>

      {canSeeJournal && (
        <h3 className="mt-4 text-sm font-medium text-text-primary">{intl.get('mcp.journal')}</h3>
      )}
      {!canSeeJournal ? null : calls.length === 0 ? (
        <p className="mt-2 text-sm text-text-muted">{intl.get('mcp.journal_empty')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {calls.map((call: any) => (
            <li key={call.id} className="flex flex-wrap gap-x-3">
              <span className="text-text-muted">{call.created_at ?? call.createdAt}</span>
              <code className="font-mono">{call.metadata?.tool}</code>
              <span>{tokenName(call.subject_id ?? call.subjectId)}</span>
              <span className={call.metadata?.ok ? 'text-text-secondary' : 'text-danger'}>
                {call.metadata?.ok ? intl.get('mcp.call_ok') : intl.get('mcp.call_failed')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
