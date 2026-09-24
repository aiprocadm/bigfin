// © 2026 Bigfin
import { useMutation, useQueryClient } from 'react-query';

import { useRequestQuery } from '../useQueryRequest';
import useApiRequest from '../useRequest';
import t from './types';
import { fromApi } from '@/utils/fromApi';
import { downloadFile } from '@/hooks/useDownloadFile';
import { showApiError } from '@/utils/showApiError';

/**
 * AI CFO (FT-100…FT-102 ТЗ-3): вопрос → ответ с доказательствами, записка,
 * контекст бизнеса.
 *
 * Сервер отдаёт snake_case, а перехватчик запросов ДОБАВЛЯЕТ camelCase-копии
 * рядом. Здесь ответ переводится `fromApi` в чистый camelCase: тело
 * предпросмотра переноса уходит обратно на сервер, и лишние змеиные копии
 * полей в нём ни к чему.
 */

export interface AiCfoPeriod {
  fromDate: string;
  toDate: string;
}

export interface AiCfoIntent {
  key: string;
  example: string;
}

/** Что открыть по «Показать операции»: та же панель, что у ячейки отчёта. */
export interface AiCfoDrill {
  articleId?: number;
  accountId?: number;
  plType?: string;
  fromDate: string;
  toDate: string;
  basis?: 'cash' | 'accrual';
  title?: string;
}

export interface AiCfoFigure {
  key: string;
  label: string;
  value: number | null;
  kind: 'money' | 'percent' | 'date' | 'count';
  date?: string;
  drill?: AiCfoDrill;
  link?: string;
}

export interface AiCfoReason {
  text: string;
  figureKey?: string;
}

export interface AiCfoAction {
  kind: 'reschedule_planned_operation';
  label: string;
  plannedOperationId: number;
  amount: number;
  fromDate: string;
  toDate: string;
  preview: { method: 'POST'; path: string; body: Record<string, any> };
  execute: { method: 'POST'; path: string; body: Record<string, any> };
  requiresConfirmation: true;
}

export interface AiCfoReply {
  available: boolean;
  understood: boolean;
  message?: string;
  intent?: string;
  period?: AiCfoPeriod;
  base?: AiCfoPeriod | null;
  empty?: boolean;
  headline?: string;
  figures?: AiCfoFigure[];
  reasons?: AiCfoReason[];
  table?: { columns: string[]; rows: Array<Array<string | number | null>> };
  actions?: AiCfoAction[];
  links?: Array<{ label: string; href: string }>;
  meta?: {
    basis: string;
    currency: string;
    legalEntities: string;
    calculatedAt: string;
  };
  explanation?: {
    source: 'model' | 'template';
    text: string;
    rejectedNumbers: number[];
    note?: string;
  };
}

export interface AiCfoMemoSection {
  key: string;
  title: string;
  text: string[];
  figures: Array<{ label: string; value: number | null }>;
  chart?: Array<{ label: string; value: number }>;
}

export interface AiCfoBusinessContext {
  industry: string | null;
  stage: 'start' | 'growth' | 'mature' | null;
  size: 'micro' | 'small' | 'medium' | null;
  salesModel: 'b2b' | 'b2c' | 'mixed' | null;
  note: string | null;
}

export interface AiCfoMemo {
  period: AiCfoPeriod;
  context: AiCfoBusinessContext;
  sections: AiCfoMemoSection[];
  calculatedAt: string;
}

export interface AiCfoContextResponse {
  inferred: AiCfoBusinessContext;
  saved: Partial<AiCfoBusinessContext> | null;
  effective: AiCfoBusinessContext;
}

/** Какие вопросы понимает AI CFO — с примерами (8 видов). */
export function useAiCfoIntents(props?: any) {
  return useRequestQuery<AiCfoIntent[]>(
    [t.AI_CFO_INTENTS],
    { method: 'get', url: 'ai-cfo/intents' },
    {
      select: (res: any) => fromApi(res.data?.data ?? []),
      defaultData: [],
      ...props,
    },
  );
}

/**
 * Задать вопрос. `POST` — только потому, что вопрос длинный: ручка ничего
 * не меняет.
 */
export function useAskAiCfo(props?: any) {
  const apiRequest = useApiRequest();

  return useMutation<AiCfoReply, any, { question: string; period?: AiCfoPeriod }>(
    (values) =>
      apiRequest
        .post('ai-cfo/ask', values)
        // Ответ приходит без обёртки `data` — держим обе формы на случай,
        // если сервер её добавит.
        .then((res: any) => fromApi(res.data?.data ?? res.data) as AiCfoReply),
    props,
  );
}

/** Аналитическая записка за период (FT-100). */
export function useAiCfoMemo(period: AiCfoPeriod, props?: any) {
  return useRequestQuery<AiCfoMemo | null>(
    [t.AI_CFO_MEMO, period.fromDate, period.toDate],
    {
      method: 'get',
      url: 'ai-cfo/memo',
      params: { fromDate: period.fromDate, toDate: period.toDate },
    },
    {
      select: (res: any) => fromApi(res.data?.data ?? null),
      defaultData: null,
      enabled: Boolean(period.fromDate && period.toDate),
      ...props,
    },
  );
}

/**
 * Записка в PDF. Файл просим с теми же заголовками входа, что и все
 * запросы витрины, — простая ссылка `<a href>` пришла бы без них и получила
 * бы отказ.
 */
export function useDownloadAiCfoMemoPdf() {
  const apiRequest = useApiRequest();

  const mutation = useMutation<any, any, AiCfoPeriod>((period) =>
    apiRequest.get('ai-cfo/memo/pdf', {
      responseType: 'blob',
      headers: { accept: 'application/pdf' },
      params: { fromDate: period.fromDate, toDate: period.toDate },
    }),
  );

  const download = (period: AiCfoPeriod) =>
    mutation
      .mutateAsync(period)
      .then((res: any) => {
        downloadFile(
          res.data,
          `bigfin-memo-${period.fromDate}-${period.toDate}.pdf`,
          'application/pdf',
        );
      })
      // Отказ сервера приезжает файлом — showApiError умеет его прочитать.
      .catch((error: unknown) => showApiError(error));

  return { ...mutation, download };
}

/** Оценка полезности записки — в журнал (FT-100). */
export function useRateAiCfoMemo(props?: any) {
  const apiRequest = useApiRequest();

  return useMutation<any, any, { useful: boolean; comment?: string; period?: AiCfoPeriod }>(
    (values) => apiRequest.post('ai-cfo/memo/rating', values),
    props,
  );
}

/** Контекст бизнеса: выведенный из данных, сохранённый и итоговый (FT-101). */
export function useAiCfoContext(props?: any) {
  return useRequestQuery<AiCfoContextResponse | null>(
    [t.AI_CFO_CONTEXT],
    { method: 'get', url: 'ai-cfo/context' },
    {
      select: (res: any) => fromApi(res.data?.data ?? null),
      defaultData: null,
      ...props,
    },
  );
}

/** Сохранить контекст. После сохранения записка пересчитывается с ним. */
export function useSaveAiCfoContext(props?: any) {
  const queryClient = useQueryClient();
  const apiRequest = useApiRequest();

  return useMutation<any, any, Partial<AiCfoBusinessContext>>(
    (values) => apiRequest.put('ai-cfo/context', values),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(t.AI_CFO_CONTEXT);
        // Текст записки зависит от контекста — старая версия была бы неправдой.
        queryClient.invalidateQueries(t.AI_CFO_MEMO);
      },
      ...props,
    },
  );
}
