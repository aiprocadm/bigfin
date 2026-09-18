import React from 'react';
import intl from 'react-intl-universal';
import { useQuery } from 'react-query';
import moment from 'moment';
import { X } from 'lucide-react';

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface DrillDownTarget {
  accountId: number;
  accountName?: string;
  fromDate: string;
  toDate: string;
}

interface DrillDownRow {
  date: string;
  transactionNumber: string | null;
  contactName: string | null;
  note: string | null;
  formattedAmount: string;
}

/**
 * Панель «из чего сложилась сумма» (этап 4 ТЗ, п. 4.2).
 *
 * ТЗ называет это ключевым требованием: «без него пользователь не доверяет
 * цифрам и уходит обратно в Excel». Поэтому итог панели показывается рядом со
 * списком — человек видит, что сумма сходится с той, по которой он щёлкнул.
 */
export default function ReportDrillDownPanel({
  target,
  onClose,
}: {
  target: DrillDownTarget | null;
  onClose: () => void;
}) {
  const apiRequest = useApiRequest();

  const { data, isLoading, isError } = useQuery(
    ['REPORT_DRILL_DOWN', target?.accountId, target?.fromDate, target?.toDate],
    () =>
      apiRequest
        .get('financial-reports/drill-down', {
          params: {
            accountId: target?.accountId,
            from: target?.fromDate,
            to: target?.toDate,
          },
        })
        .then((res: any) => transformToCamelCase(res.data)),
    { enabled: Boolean(target?.accountId) },
  );

  if (!target) return null;

  const rows: DrillDownRow[] = (data as any)?.transactions ?? [];

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-lg">
      <header className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-base font-medium text-text-primary">
            {(data as any)?.accountName ?? target.accountName ?? ''}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {moment(target.fromDate).format('D MMM YYYY')} —{' '}
            {moment(target.toDate).format('D MMM YYYY')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          aria-label={intl.get('close')}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <p className="text-sm text-danger">
            {intl.get('reports.drill_down.error')}
          </p>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <p className="text-sm text-text-secondary">
            {intl.get('reports.drill_down.empty')}
          </p>
        )}

        {rows.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row, index) => (
              <li
                key={`${row.transactionNumber ?? 'row'}-${index}`}
                className="flex items-start justify-between gap-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="text-text-primary">
                    {moment(row.date).format('D MMM YYYY')}
                    {row.contactName ? ` · ${row.contactName}` : ''}
                  </div>
                  <div className="truncate text-text-secondary">
                    {row.note || row.transactionNumber || '—'}
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-text-primary">
                  {row.formattedAmount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        Итог внизу — ради него всё и затевалось: он обязан совпасть с числом,
        по которому человек щёлкнул в отчёте.
      */}
      {(data as any)?.formattedTotal && (
        <footer className="flex items-center justify-between gap-3 border-t border-border p-4 text-sm">
          <span className="text-text-secondary">
            {intl.get('reports.drill_down.total')}
          </span>
          <span className="font-medium tabular-nums text-text-primary">
            {(data as any).formattedTotal}
          </span>
        </footer>
      )}
    </aside>
  );
}
