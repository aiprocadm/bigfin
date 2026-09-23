// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useDrawerActions } from '@/hooks/state/dashboard';
import { useDataQualityAccrualShifts } from '@/hooks/query/dataQuality';
import { resolveReferenceDrawer } from './drawerUtils';
import { fmt, fmtDate } from './utils';

interface Props {
  fromDate: string;
  toDate: string;
}

/**
 * «Месяц начисления вне периода» (FT-013 ТЗ-3).
 *
 * Операция с месяцем начисления видна в прибыли одним месяцем, а в деньгах
 * — другим. Когда один из месяцев за границей периода, отчёт о деньгах и
 * отчёт о прибыли за период расходятся ровно на такие операции. Здесь они
 * перечислены, чтобы разницу не искать руками.
 */
export function AccrualShiftsTab({ fromDate, toDate }: Props) {
  const { data } = useDataQualityAccrualShifts({ fromDate, toDate }, {});
  const { openDrawer } = useDrawerActions();
  const items: any[] = data?.items ?? [];

  const open = (row: any) => {
    const target = resolveReferenceDrawer('CashflowTransaction', row.id);
    if (target) openDrawer(target.name, target.payload);
  };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.accrual_shifts.title')}
      </h2>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.accrual_shifts.hint')}
      </p>
      {items.length === 0 ? (
        <p className="text-sm">{intl.get('data_quality.accrual_shifts.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-text-secondary">
                <th className="py-1">{intl.get('date')}</th>
                <th className="py-1">{intl.get('accrual_period.label')}</th>
                <th className="py-1">{intl.get('description')}</th>
                <th className="py-1 text-right">{intl.get('amount')}</th>
                <th className="py-1">{intl.get('data_quality.accrual_shifts.effect')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b hover:bg-surface-elevated"
                  onClick={() => open(row)}
                >
                  <td className="py-1">{fmtDate(row.date)}</td>
                  <td className="py-1">{row.accrualPeriod}</td>
                  <td className="py-1">{row.description || row.transactionNumber || '—'}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(row.amount)}</td>
                  <td className="py-1 text-text-secondary">
                    {intl.get(`data_quality.accrual_shifts.kind.${row.kind}`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
