// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import {
  useApiScopes,
  useApiTokens,
  useCreateApiToken,
  useCreateWebhook,
  useDeleteWebhook,
  useRevokeApiToken,
  useWebhookDeliveries,
  useWebhookEvents,
  useWebhooks,
  type ApiTokenRow,
  type WebhookRow,
} from '@/hooks/query/publicApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { pickScreenState } from '@/components/ui/screen-state';
import { ScreenError } from '@/components/ui/screen-error';
import { cn } from '@/lib/cn';

import { McpServerSection } from './McpServerSection';
import {
  canRevoke,
  isDeliverySuccessful,
  scopesSummary,
  tokenState,
} from './publicApiView';

function Section({
  title,
  hint,
  children,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-default border border-border p-4">
      <h2 className="text-sm font-medium text-text-primary">{title}</h2>
      {hint && <p className="mt-1 text-sm text-text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Раздел «Публичный API» (остаток П1 этапа 15).
 *
 * Сервер умел выпускать токены и слать вебхуки с самого этапа 15, но
 * воспользоваться этим было нельзя: экрана не существовало. Здесь он и
 * появляется.
 *
 * Главное правило раздела: ТОКЕН ПОКАЗЫВАЕТСЯ ОДИН РАЗ. Это неудобно и
 * сделано намеренно — «покажите мой токен ещё раз» означало бы, что он
 * лежит в базе целиком.
 */
export default function PublicApiPreferences() {
  const tokens = useApiTokens();
  const webhooks = useWebhooks();
  const scopes = useApiScopes();
  const events = useWebhookEvents();

  const { mutateAsync: createToken, isLoading: isCreatingToken } =
    useCreateApiToken();
  const { mutateAsync: revokeToken } = useRevokeApiToken();
  const { mutateAsync: createWebhook, isLoading: isCreatingWebhook } =
    useCreateWebhook();
  const { mutateAsync: deleteWebhook } = useDeleteWebhook();

  const [tokenName, setTokenName] = React.useState('');
  const [tokenScopes, setTokenScopes] = React.useState<string[]>([]);
  /** Выпущенный токен — живёт только в памяти страницы и только до ухода. */
  const [issuedToken, setIssuedToken] = React.useState<string | null>(null);

  const [webhookEvent, setWebhookEvent] = React.useState('');
  const [webhookUrl, setWebhookUrl] = React.useState('');
  const [openDeliveries, setOpenDeliveries] = React.useState<number | null>(
    null,
  );
  const deliveries = useWebhookDeliveries(openDeliveries ?? undefined);

  const screenState = pickScreenState({
    isLoading: tokens.isLoading || webhooks.isLoading,
    isError: tokens.isError || webhooks.isError,
  });

  if (screenState === 'loading') {
    return <Skeleton className="m-6 h-96 w-full" />;
  }

  if (screenState === 'error') {
    return (
      <div className="p-6">
        <ScreenError
          message={intl.get('public_api.error')}
          onRetry={() => {
            tokens.refetch?.();
            webhooks.refetch?.();
          }}
        />
      </div>
    );
  }

  const onCreateToken = async () => {
    const name = tokenName.trim();
    if (!name) return;

    const created: any = await createToken({ name, scopes: tokenScopes });
    const token =
      created?.data?.data?.token ?? created?.data?.token ?? created?.token;

    setIssuedToken(token ?? null);
    setTokenName('');
    setTokenScopes([]);
  };

  const onCreateWebhook = async () => {
    const url = webhookUrl.trim();
    if (!webhookEvent || !url) return;

    await createWebhook({ event: webhookEvent, url });
    setWebhookUrl('');
  };

  return (
    <div className="bigfin-ui flex flex-col gap-4 p-6">
      <Section
        title={intl.get('public_api.tokens.title')}
        hint={intl.get('public_api.tokens.hint')}
      >
        {/*
          Выпущенный токен показывается ровно здесь и ровно один раз. Уйдёт
          со страницы — второй попытки не будет.
        */}
        {issuedToken && (
          <div className="mb-3 rounded-control border border-warning bg-warning/10 p-3 text-sm">
            <p className="font-medium">
              {intl.get('public_api.tokens.issued_once')}
            </p>
            <code className="mt-2 block break-all rounded-control bg-surface p-2 font-mono text-xs">
              {issuedToken}
            </code>
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              onClick={() => setIssuedToken(null)}
            >
              {intl.get('public_api.tokens.saved_it')}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm" htmlFor="public-api-token-name">
              {intl.get('public_api.tokens.name')}
            </label>
            <Input
              id="public-api-token-name"
              value={tokenName}
              onChange={(event) => setTokenName(event.target.value)}
              placeholder={intl.get('public_api.tokens.name_placeholder')}
            />
          </div>
          <Button
            type="button"
            onClick={onCreateToken}
            disabled={isCreatingToken || !tokenName.trim()}
          >
            {intl.get('public_api.tokens.create')}
          </Button>
        </div>

        {/* Права выбираются из списка сервера, а не выдумываются витриной. */}
        {(scopes.data?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {scopes.data?.map((scope: any) => {
              const key = String(scope?.key ?? scope);
              const checked = tokenScopes.includes(key);

              return (
                <label
                  key={key}
                  className={cn(
                    'cursor-pointer rounded-control border px-2 py-1 text-xs',
                    checked
                      ? 'border-accent text-text-primary'
                      : 'border-border text-text-muted',
                  )}
                >
                  <input
                    type="checkbox"
                    className="mr-1"
                    checked={checked}
                    onChange={() =>
                      setTokenScopes((prev) =>
                        prev.includes(key)
                          ? prev.filter((item) => item !== key)
                          : [...prev, key],
                      )
                    }
                  />
                  {key}
                </label>
              );
            })}
          </div>
        )}

        {tokens.data?.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2">{intl.get('public_api.tokens.name')}</th>
                  <th className="py-2">{intl.get('public_api.tokens.tail')}</th>
                  <th className="py-2">{intl.get('public_api.tokens.scopes')}</th>
                  <th className="py-2">{intl.get('public_api.tokens.state')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {tokens.data?.map((token: ApiTokenRow) => (
                  <tr key={token.id} className="border-b border-border/60">
                    <td className="py-2">{token.name}</td>
                    <td className="py-2 font-mono text-xs">
                      …{token.lastFour}
                    </td>
                    <td className="py-2 text-text-muted">
                      {scopesSummary(
                        token.scopes,
                        intl.get('public_api.tokens.no_scopes'),
                      )}
                    </td>
                    <td className="py-2">
                      {intl.get(
                        `public_api.tokens.state.${tokenState(token)}`,
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canRevoke(token)}
                        onClick={() => revokeToken(token.id)}
                      >
                        {intl.get('public_api.tokens.revoke')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            {intl.get('public_api.tokens.empty')}
          </p>
        )}
      </Section>

      <Section
        title={intl.get('public_api.webhooks.title')}
        hint={intl.get('public_api.webhooks.hint')}
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm" htmlFor="public-api-webhook-event">
              {intl.get('public_api.webhooks.event')}
            </label>
            <select
              id="public-api-webhook-event"
              className="rounded-control border border-border bg-surface px-2 py-1 text-sm"
              value={webhookEvent}
              onChange={(event) => setWebhookEvent(event.target.value)}
            >
              <option value="">
                {intl.get('public_api.webhooks.event_placeholder')}
              </option>
              {events.data?.map((item: any) => {
                const key = String(item?.key ?? item);
                return (
                  <option key={key} value={key}>
                    {key}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm" htmlFor="public-api-webhook-url">
              {intl.get('public_api.webhooks.url')}
            </label>
            <Input
              id="public-api-webhook-url"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://example.com/hooks/bigfin"
            />
          </div>
          <Button
            type="button"
            onClick={onCreateWebhook}
            disabled={isCreatingWebhook || !webhookEvent || !webhookUrl.trim()}
          >
            {intl.get('public_api.webhooks.create')}
          </Button>
        </div>

        {webhooks.data?.length ? (
          <div className="mt-4 flex flex-col gap-2">
            {webhooks.data?.map((webhook: WebhookRow) => (
              <div
                key={webhook.id}
                className="rounded-control border border-border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-medium">{webhook.event}</span>
                    <span className="break-all text-text-muted">
                      {webhook.url}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setOpenDeliveries((prev) =>
                          prev === webhook.id ? null : webhook.id,
                        )
                      }
                    >
                      {intl.get('public_api.webhooks.deliveries')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => deleteWebhook(webhook.id)}
                    >
                      {intl.get('public_api.webhooks.delete')}
                    </Button>
                  </div>
                </div>

                {openDeliveries === webhook.id && (
                  <div className="mt-3 border-t border-border pt-3">
                    {deliveries.data?.length ? (
                      <ul className="flex flex-col gap-1">
                        {deliveries.data?.map((delivery: any) => (
                          <li
                            key={delivery.id}
                            className="flex flex-wrap items-baseline justify-between gap-2"
                          >
                            <span className="tabular-nums text-text-muted">
                              {intl.get('public_api.deliveries.attempt', {
                                attempt: delivery.attempt,
                              })}
                            </span>
                            <span
                              className={cn(
                                'tabular-nums',
                                !isDeliverySuccessful(delivery) &&
                                  'text-danger',
                              )}
                            >
                              {delivery.responseCode ??
                                intl.get('public_api.deliveries.no_answer')}
                            </span>
                            {/* Причина отказа — то, ради чего журнал и нужен. */}
                            {delivery.error && (
                              <span className="w-full text-text-muted">
                                {delivery.error}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-text-muted">
                        {intl.get('public_api.deliveries.empty')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            {intl.get('public_api.webhooks.empty')}
          </p>
        )}
      </Section>

      {/* MCP-сервер для ИИ-агентов (FT-090 ТЗ-3): тем же токеном. */}
      <McpServerSection tokens={tokens.data ?? []} />
    </div>
  );
}
