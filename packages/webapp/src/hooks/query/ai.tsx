// © 2026 Bigfin
import { useMutation, useQueryClient } from 'react-query';

import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';

export interface AiInsight {
  text: string;
  link: string | null;
  reportKey: string | null;
}

export interface AiInsightsResult {
  available: boolean;
  reason: string | null;
  /** Что показать вместо выводов, когда их нет. */
  message: string | null;
  generatedFor: string | null;
  insights: AiInsight[];
}

export interface AiAnalystSettings {
  provider: string;
  endpoint: string | null;
  folderId: string | null;
  model: string | null;
  /** Ключ наружу не отдаётся никогда — только признак, что он задан. */
  apiKeySet: boolean;
  forbidExternalData: boolean;
}

export interface ChatReply {
  available: boolean;
  text: string;
  links: string[];
  usedTools: string[];
  rejection: string | null;
}

/**
 * Выводы «Что говорят цифры» для экрана (этап 13 ТЗ).
 *
 * Значение по умолчанию — «недоступно», а НЕ пустой список выводов. Пустой
 * список выглядит так же, как «модели нечего сказать», и человек решает, что
 * у него в делах всё ровно.
 */
export function useAiInsights(scope: string, props?: any) {
  return useRequestQuery(
    [t.AI_INSIGHTS, scope],
    { method: 'get', url: `ai-analyst/insights/${scope}` },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        available: false,
        reason: null,
        message: null,
        generatedFor: null,
        insights: [],
      } as AiInsightsResult,
      enabled: Boolean(scope),
      ...props,
    },
  );
}

/** Доступен ли раздел и, если нет, почему именно. */
export function useAiAvailability(props?: any) {
  return useRequestQuery(
    [t.AI_AVAILABILITY],
    { method: 'get', url: 'ai-analyst/availability' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: { available: false, reason: null },
      ...props,
    },
  );
}

export function useAiAnalystSettings(props?: any) {
  return useRequestQuery(
    [t.AI_SETTINGS],
    { method: 'get', url: 'ai-analyst/settings' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: {
        provider: '',
        endpoint: null,
        folderId: null,
        model: null,
        apiKeySet: false,
        forbidExternalData: false,
      } as AiAnalystSettings,
      ...props,
    },
  );
}

/**
 * Сохранить настройки.
 *
 * Пустое поле ключа НЕ стирает сохранённый ключ — так решено на сервере:
 * иначе открытие формы и нажатие «Сохранить» ломали бы рабочую интеграцию.
 */
export function useSaveAiAnalystSettings(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, Record<string, unknown>>(
    (values) => apiRequest.put('ai-analyst/settings', values),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(t.AI_SETTINGS);
        // От настроек зависит и доступность, и сами выводы.
        queryClient.invalidateQueries(t.AI_AVAILABILITY);
        queryClient.invalidateQueries(t.AI_INSIGHTS);
      },
      ...props,
    },
  );
}

/** О чём вообще можно спросить. */
export function useAiChatTools(props?: any) {
  return useRequestQuery(
    [t.AI_CHAT_TOOLS],
    { method: 'get', url: 'ai-chat/tools' },
    {
      select: (res: any) => res.data?.data ?? res.data,
      defaultData: [],
      ...props,
    },
  );
}

/** Задать вопрос о своих финансах. */
export function useAskAiChat(props?: any) {
  const apiRequest = useApiRequest();

  return useMutation<any, any, { question: string }>(
    (values) => apiRequest.post('ai-chat/ask', values),
    props,
  );
}
