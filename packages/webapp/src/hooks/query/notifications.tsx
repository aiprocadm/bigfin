// © 2026 Bigfin
import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from 'react-query';
import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationPreferenceItem {
  eventType: string;
  enabled: boolean;
  channels: string[];
  threshold: Record<string, any> | null;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferenceItem[];
  recipientEmail: string | null;
  cooldownHours: number;
  telegram?: { connected: boolean };
}

export interface UpdateNotificationPreferencesValues {
  preferences: NotificationPreferenceItem[];
  recipientEmail?: string;
  cooldownHours?: number;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Настройки уведомлений (GET notifications/preferences). */
export function useNotificationPreferences(props?: any) {
  return useRequestQuery(
    [t.NOTIFICATION_PREFERENCES],
    { method: 'get', url: 'notifications/preferences' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: null,
      ...props,
    },
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Сохранить настройки уведомлений (PUT notifications/preferences). */
export function useUpdateNotificationPreferences(
  props?: UseMutationOptions<any, any, UpdateNotificationPreferencesValues>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, UpdateNotificationPreferencesValues>(
    (values) => api.put('notifications/preferences', values),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATION_PREFERENCES);
      },
      ...props,
    },
  );
}

/** Подключить telegram-бота (POST notifications/telegram/connect). */
export function useConnectTelegram(
  props?: UseMutationOptions<any, any, { botToken: string }>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, { botToken: string }>(
    (values) => api.post('notifications/telegram/connect', values),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATION_PREFERENCES);
      },
      ...props,
    },
  );
}

/** Отключить telegram-бота (POST notifications/telegram/disconnect). */
export function useDisconnectTelegram(props?: UseMutationOptions<any, any, void>) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.post('notifications/telegram/disconnect', {}),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATION_PREFERENCES);
      },
      ...props,
    },
  );
}

// ---------------------------------------------------------------------------
// In-app лента
// ---------------------------------------------------------------------------

/** Список последних in-app уведомлений (GET notifications). */
export function useNotifications(props?: any) {
  return useRequestQuery(
    [t.NOTIFICATIONS_LIST],
    { method: 'get', url: 'notifications' },
    {
      select: (res: any) =>
        res.data?.data?.notifications ?? res.data?.notifications ?? [],
      defaultData: [],
      ...props,
    },
  );
}

/** Число непрочитанных (GET notifications/unread-count), поллинг 60с. */
export function useUnreadCount(props?: any) {
  return useRequestQuery(
    [t.NOTIFICATIONS_UNREAD],
    { method: 'get', url: 'notifications/unread-count' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { count: 0 },
      refetchInterval: 60_000,
      ...props,
    },
  );
}

/** Отметить одно уведомление прочитанным (PUT notifications/:id/read). */
export function useMarkNotificationRead(
  props?: UseMutationOptions<any, any, number>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, number>(
    (id) => api.put(`notifications/${id}/read`, {}),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATIONS_LIST);
        client.invalidateQueries(t.NOTIFICATIONS_UNREAD);
      },
      ...props,
    },
  );
}

/** Отметить все прочитанными (PUT notifications/read-all). */
export function useMarkAllNotificationsRead(
  props?: UseMutationOptions<any, any, void>,
) {
  const client = useQueryClient();
  const api: any = useApiRequest();
  return useMutation<any, any, void>(
    () => api.put('notifications/read-all', {}),
    {
      onSuccess: () => {
        client.invalidateQueries(t.NOTIFICATIONS_LIST);
        client.invalidateQueries(t.NOTIFICATIONS_UNREAD);
      },
      ...props,
    },
  );
}
