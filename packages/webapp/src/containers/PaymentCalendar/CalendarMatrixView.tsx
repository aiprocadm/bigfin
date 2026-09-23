// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';

import { DateField } from '@/components/ui/date-field';
import { useCalendarMatrix } from '@/hooks/query/paymentCalendar';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { cn } from '@/lib/cn';
import { matrixRowsView, type MatrixSideKey } from './calendarMatrixView';

const selectClassName = 'border-input bg-background h-9 rounded-control border px-3 text-sm';
const money = (value: number) => formatOrganizationMoney(value ?? 0);

/**
 * Календарь матрицей «план / факт» (FT-050 ТЗ-3). Строки: остаток на
 * начало, поступления, списания, изменение, остаток на конец; в каждой
 * колонке — ПЛАН и ФАКТ. Плановый остаток накапливается: конец колонки —
 * начало следующей. Отрицательный плановый конец — разрыв, он подсвечен.
 */
export function CalendarMatrixView({ accountId }: { accountId: number | null }) {
  const [fromDate, setFromDate] = React.useState(moment().startOf('month').subtract(2, 'months').format('YYYY-MM-DD'));
  const [toDate, setToDate] = React.useState(moment().endOf('month').add(3, 'months').format('YYYY-MM-DD'));
  const [granularity, setGranularity] = React.useState<'week' | 'month' | 'quarter'>('month');
  const [groupBy, setGroupBy] = React.useState<'articles' | 'contacts' | 'projects'>('articles');
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  const { data, isError, error } = useCalendarMatrix({
    fromDate,
    toDate,
    granularity,
    groupBy,
    ...(accountId != null ? { accountId } : {}),
  });
  const view = React.useMemo(() => (data ? matrixRowsView(data) : null), [data]);

  const toggle = (key: string) => setOpen((current) => ({ ...current, [key]: !current[key] }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <DateField value={fromDate} onChange={setFromDate} />
        <span className="text-text-secondary">—</span>
        <DateField value={toDate} onChange={setToDate} />
        <select
          className={selectClassName}
          aria-label={intl.get('payment_calendar.granularity')}
          value={granularity}
          onChange={(event) => setGranularity(event.target.value as typeof granularity)}
        >
          {(['week', 'month', 'quarter'] as const).map((value) => (
            <option key={value} value={value}>
              {intl.get(`payment_calendar.granularity.${value}`)}
            </option>
          ))}
        </select>
        <select
          className={selectClassName}
          aria-label={intl.get('payment_calendar.matrix.group_by')}
          value={groupBy}
          onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}
        >
          {(['articles', 'contacts', 'projects'] as const).map((value) => (
            <option key={value} value={value}>
              {intl.get(`payment_calendar.matrix.group.${value}`)}
            </option>
          ))}
        </select>
      </div>

      {isError && (
        <p className="text-sm text-danger">
          {(error as any)?.response?.data?.errors?.[0]?.message ?? intl.get('payment_calendar.matrix.failed')}
        </p>
      )}

      {view && (
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="min-w-full text-sm tabular-nums">
            <thead className="bg-surface-elevated">
              <tr>
                <th className="sticky left-0 z-10 bg-surface-elevated px-3 py-2 text-left" rowSpan={2}>
                  {intl.get('payment_calendar.matrix.row')}
                </th>
                {view.columns.map((column) => (
                  <th key={column.key} colSpan={2} className="border-l border-border px-3 py-1 text-center">
                    {column.label}
                  </th>
                ))}
              </tr>
              <tr>
                {view.columns.map((column) =>
                  (['plan', 'fact'] as MatrixSideKey[]).map((side) => (
                    <th key={`${column.key}-${side}`} className="px-3 py-1 text-right text-xs font-normal text-text-secondary">
                      {intl.get(`payment_calendar.matrix.${side}`)}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <React.Fragment key={row.key}>
                  <tr className={cn(row.strong && 'font-medium', 'border-t border-border')}>
                    <td className="sticky left-0 bg-surface px-3 py-1.5">
                      {row.children.length > 0 ? (
                        <button type="button" className="text-left" onClick={() => toggle(row.key)}>
                          {open[row.key] ? '▾ ' : '▸ '}
                          {intl.get(`payment_calendar.matrix.${row.key}`)}
                        </button>
                      ) : (
                        intl.get(`payment_calendar.matrix.${row.key}`)
                      )}
                    </td>
                    {row.cells.map((cell, index) => (
                      <td
                        key={index}
                        className={cn(
                          'px-3 py-1.5 text-right money',
                          cell.gap && 'bg-red-50 text-red-700',
                        )}
                      >
                        {money(cell.value)}
                      </td>
                    ))}
                  </tr>
                  {open[row.key] &&
                    row.children.map((child) => (
                      <tr key={`${row.key}-${child.key}`} className="text-text-secondary">
                        <td className="sticky left-0 bg-surface px-3 py-1 pl-8">
                          {child.name ??
                            intl.get(
                              child.key === 'transfer'
                                ? 'payment_calendar.matrix.transfer'
                                : `payment_calendar.matrix.no_${groupBy}`,
                            )}
                        </td>
                        {child.cells.map((cell, index) => (
                          <td key={index} className="px-3 py-1 text-right money">
                            {cell.value ? money(cell.value) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
