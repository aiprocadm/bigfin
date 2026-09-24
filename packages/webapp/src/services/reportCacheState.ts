// © 2026 Bigfin
import { useSyncExternalStore } from 'react';

/**
 * Последний ответ отчёта: пришёл ли он из кэша и когда посчитан (FT-093 ТЗ-3).
 *
 * Сервер кладёт время расчёта в заголовок `x-bigfin-report-cached-at`, если
 * отдал отчёт из кэша. Отчётов два десятка, и у каждого свои хуки данных —
 * учить каждый читать заголовок значило бы забыть половину. Поэтому ответ
 * запоминается здесь, в общем обработчике запросов, а плашку «Данные на …»
 * рисует одна общая полоса над экраном отчёта.
 */
export interface LastReportResponse {
  /** Адрес отчёта без параметров, например `/reports/balance-sheet`. */
  path: string;
  /** Параметры, с которыми его просили, — для «Пересобрать». */
  query: Record<string, unknown>;
  /** Когда посчитан (из кэша) или null — посчитан только что. */
  cachedAt: string | null;
}

let last: LastReportResponse | null = null;
const listeners = new Set<() => void>();

export function isReportUrl(url: string | undefined): boolean {
  const path = String(url ?? '').split('?')[0].replace(/^\/?(api\/)?/, '/');
  return path.startsWith('/reports/') && !path.startsWith('/reports/cache');
}

export function reportRequestOf(
  url: string,
  params: Record<string, unknown> | undefined,
): Pick<LastReportResponse, 'path' | 'query'> {
  const [rawPath, search] = String(url).split('?');
  const path = rawPath.replace(/^\/?(api\/)?/, '/');
  const query: Record<string, unknown> = {};
  new URLSearchParams(search ?? '').forEach((value, key) => {
    const name = key.replace(/\[\]$/, '');
    const current = query[name];
    query[name] = current === undefined ? value : ([] as unknown[]).concat(current, value);
  });
  return { path, query: { ...query, ...(params ?? {}) } };
}

export function recordReportResponse(response: {
  config?: { url?: string; params?: Record<string, unknown>; method?: string };
  headers?: Record<string, string>;
}): void {
  const url = response?.config?.url;
  if (!isReportUrl(url) || String(response?.config?.method ?? 'get').toLowerCase() !== 'get') return;
  last = {
    ...reportRequestOf(url as string, response.config?.params),
    cachedAt: response.headers?.['x-bigfin-report-cached-at'] ?? null,
  };
  listeners.forEach((listener) => listener());
}

export function getLastReportResponse(): LastReportResponse | null {
  return last;
}

export function useLastReportResponse(): LastReportResponse | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => last,
    () => null,
  );
}
