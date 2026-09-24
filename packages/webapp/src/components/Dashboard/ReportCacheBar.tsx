// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from 'react-query';
import { Intent } from '@blueprintjs/core';
import { RefreshCw } from 'lucide-react';

import { AppToaster } from '@/components/AppToaster';
import useApiRequest from '@/hooks/useRequest';
import { useLastReportResponse } from '@/services/reportCacheState';

/** Экраны отчётов — там и живёт плашка. Список отчётов и журнал — не отчёты. */
export function isReportScreen(pathname: string): boolean {
  return (
    pathname.startsWith('/financial-reports/') &&
    !pathname.startsWith('/financial-reports/audit-log')
  );
}

/** «2026-09-24 10:05:00» → «10:05» сегодня или «24.09 10:05» в другой день. */
export function cachedAtLabel(cachedAt: string, now = new Date()): string {
  const [date, time = ''] = cachedAt.split(' ');
  const hhmm = time.slice(0, 5);
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  if (date === today) return hhmm;
  const [, month, day] = date.split('-');
  return `${day}.${month} ${hhmm}`;
}

/**
 * «Данные на …» и «Пересобрать» (FT-093 ТЗ-3) — над любым экраном отчёта.
 *
 * Видна, только если отчёт пришёл из кэша: свежепосчитанному отчёту незачем
 * говорить «данные на» — они на сейчас. Пересборка идёт на сервере в фоне, а
 * полоса показывает, где она сейчас, — в отличие от «может занять несколько
 * минут» без всякого знака жизни.
 */
export function ReportCacheBar() {
  const { pathname } = useLocation();
  const last = useLastReportResponse();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();
  const [progress, setProgress] = React.useState<number | null>(null);

  const rebuild = React.useCallback(async () => {
    if (!last) return;
    setProgress(5);
    try {
      const started: any = await apiRequest.post('reports/cache/rebuild', {
        path: last.path,
        query: last.query,
      });
      const id = started?.data?.data?.id;
      for (let i = 0; i < 600 && id; i++) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const res: any = await apiRequest.get(`reports/cache/rebuild/${id}`);
        const state = res?.data?.data;
        setProgress(Number(state?.progress ?? 0));
        if (state?.status === 'done') {
          AppToaster.show({ message: intl.get('report_cache.rebuilt'), intent: Intent.SUCCESS });
          // Отчёт уже лежит в кэше свежим — перечитываем его на экране.
          await queryClient.invalidateQueries();
          break;
        }
        if (state?.status === 'failed') {
          AppToaster.show({ message: intl.get('report_cache.failed'), intent: Intent.DANGER });
          break;
        }
      }
    } catch {
      // Отказ уже показан общим обработчиком запросов.
    } finally {
      setProgress(null);
    }
  }, [apiRequest, last, queryClient]);

  if (!isReportScreen(pathname) || (!last?.cachedAt && progress === null)) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface-elevated px-4 py-1.5 text-xs text-text-secondary"
    >
      {progress === null ? (
        <>
          <span>{intl.get('report_cache.data_as_of', { time: cachedAtLabel(last!.cachedAt!) })}</span>
          <button
            type="button"
            onClick={rebuild}
            className="inline-flex items-center gap-1 font-medium text-text-primary hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            {intl.get('report_cache.rebuild')}
          </button>
        </>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {intl.get('report_cache.rebuilding', { progress })}
          <span className="h-1.5 w-32 overflow-hidden rounded-full bg-border" aria-hidden>
            <span className="block h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </span>
        </span>
      )}
    </div>
  );
}
