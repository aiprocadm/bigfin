// © 2026 Bigfin
import { useMutation, useQueryClient } from 'react-query';

import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import { fromApi } from '@/utils/fromApi';

/** Строка списка токенов. Самого токена здесь нет и быть не может. */
export interface ApiTokenRow {
  id: number;
  name: string;
  /** Хвост: человек узнаёт свой токен, не раскрывая его. */
  lastFour: string;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
}

export interface WebhookRow {
  id: number;
  event: string;
  url: string;
  active: boolean;
  createdAt: string | null;
}

export interface WebhookDeliveryRow {
  id: number;
  status: string;
  responseCode: number | null;
  error: string | null;
  attempt: number;
  createdAt: string | null;
}

/** Какие права можно выдать токену — список приходит с сервера. */
export function useApiScopes(props?: any) {
  return useRequestQuery(
    [t.PUBLIC_API_SCOPES],
    { method: 'get', url: 'public-api/scopes' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: [],
      ...props,
    },
  );
}

/** На какие события можно подписаться. */
export function useWebhookEvents(props?: any) {
  return useRequestQuery(
    [t.PUBLIC_API_EVENTS],
    { method: 'get', url: 'public-api/events' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: [],
      ...props,
    },
  );
}

export function useApiTokens(props?: any) {
  return useRequestQuery(
    [t.PUBLIC_API_TOKENS],
    { method: 'get', url: 'public-api/tokens' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: [] as ApiTokenRow[],
      ...props,
    },
  );
}

/**
 * Выпустить токен.
 *
 * Ответ содержит сам токен — ЕДИНСТВЕННЫЙ раз за всю его жизнь. Экран обязан
 * показать его сразу; второй попытки не будет.
 */
export function useCreateApiToken(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, { name: string; scopes?: string[]; expiresAt?: string }>(
    (values) => apiRequest.post('public-api/tokens', values),
    {
      onSuccess: () => queryClient.invalidateQueries(t.PUBLIC_API_TOKENS),
      ...props,
    },
  );
}

/** Отозвать токен. Это не удаление: журнал использования остаётся. */
export function useRevokeApiToken(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, number>(
    (id) => apiRequest.delete(`public-api/tokens/${id}`),
    {
      onSuccess: () => queryClient.invalidateQueries(t.PUBLIC_API_TOKENS),
      ...props,
    },
  );
}

export function useWebhooks(props?: any) {
  return useRequestQuery(
    [t.PUBLIC_API_WEBHOOKS],
    { method: 'get', url: 'public-api/webhooks' },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: [] as WebhookRow[],
      ...props,
    },
  );
}

export function useCreateWebhook(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, { event: string; url: string }>(
    (values) => apiRequest.post('public-api/webhooks', values),
    {
      onSuccess: () => queryClient.invalidateQueries(t.PUBLIC_API_WEBHOOKS),
      ...props,
    },
  );
}

export function useDeleteWebhook(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, number>(
    (id) => apiRequest.delete(`public-api/webhooks/${id}`),
    {
      onSuccess: () => queryClient.invalidateQueries(t.PUBLIC_API_WEBHOOKS),
      ...props,
    },
  );
}

/** Журнал доставок: почему событие не дошло до получателя. */
export function useWebhookDeliveries(webhookId?: number, props?: any) {
  return useRequestQuery(
    [t.PUBLIC_API_DELIVERIES, webhookId],
    {
      method: 'get',
      url: `public-api/webhooks/${webhookId}/deliveries`,
    },
    {
      select: (res: any) => fromApi(res.data?.data ?? res.data),
      defaultData: [] as WebhookDeliveryRow[],
      enabled: Boolean(webhookId),
      ...props,
    },
  );
}
