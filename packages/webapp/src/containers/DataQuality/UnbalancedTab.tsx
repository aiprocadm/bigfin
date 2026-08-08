// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useDrawerActions } from '@/hooks/state/dashboard';
import { useDataQualityUnbalanced } from '@/hooks/query/dataQuality';
import { resolveReferenceDrawer } from './drawerUtils';
import { fmt, fmtDate, refTypeLabel } from './utils';

interface Props {
  fromDate: string;
  toDate: string;
}

/**
 * «Несходящиеся проводки»: документы, где дебет не равен кредиту.
 *
 * Двойная запись — основа учёта: перекос по документу означает, что баланс
 * организации неверен ровно на эту разницу. Раньше такие перекосы оседали
 * молча, увидеть их было нечем.
 */
export function UnbalancedTab({ fromDate, toDate }: Props) {
  const { data } = useDataQualityUnbalanced({ fromDate, toDate }, {});
  const { openDrawer } = useDrawerActions();

  const journals: any[] = data?.journals ?? [];
  const total = data?.totalJournals ?? 0;

  const handleClick = (row: any) => {
    const target = resolveReferenceDrawer(row.referenceType, row.referenceId);
    if (target) openDrawer(target.name, target.payload);
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.unbalanced.title')}
      </h2>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.unbalanced.hint')}
      </p>

      {journals.length > 0 && (
        <div className="text-sm">
          {intl.get('data_quality.unbalanced.total', {
            count: total,
            amount: fmt(data?.totalDifference),
          })}
        </div>
      )}

      <div className="flex flex-col divide-y rounded-md border">
        {journals.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('data_quality.unbalanced.empty')}
          </div>
        )}
        {journals.map((row) => {
          const clickable = !!resolveReferenceDrawer(
            row.referenceType,
            row.referenceId,
          );
          return (
            <div
              key={`${row.referenceType}-${row.referenceId}`}
              className={
                'flex items-center justify-between gap-3 px-4 py-3 text-sm' +
                (clickable ? ' hover:bg-muted/50 cursor-pointer' : '')
              }
              onClick={clickable ? () => handleClick(row) : undefined}
            >
              <span className="flex flex-col">
                <span className="font-medium">
                  {refTypeLabel(row.referenceType)}
                  {row.documentNumber ? ` · ${row.documentNumber}` : ''}
                </span>
                <span className="text-muted-foreground text-xs">
                  {fmtDate(row.date)}
                  {' · '}
                  {intl.get('data_quality.unbalanced.debit')}: {fmt(row.debit)}
                  {' · '}
                  {intl.get('data_quality.unbalanced.credit')}: {fmt(row.credit)}
                </span>
              </span>
              <span className="font-medium text-red-600">
                {fmt(row.difference)}
              </span>
            </div>
          );
        })}
      </div>

      {total > journals.length && (
        <div className="text-muted-foreground text-xs">
          {intl.get('data_quality.unbalanced.truncated', {
            shown: journals.length,
            total,
          })}
        </div>
      )}
    </div>
  );
}
