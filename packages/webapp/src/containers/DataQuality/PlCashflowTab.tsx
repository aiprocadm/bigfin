// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useDataQualityPlCashflow } from '@/hooks/query/dataQuality';
import { fmt, fmtMonth } from './utils';

interface Props {
  fromDate: string;
  toDate: string;
}

export function PlCashflowTab({ fromDate, toDate }: Props) {
  const { data } = useDataQualityPlCashflow({ fromDate, toDate }, {});

  const months: any[] = data?.months ?? [];
  const totals = data?.totals ?? { plNet: 0, cashNet: 0, diff: 0 };

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.pl_cashflow.title')}
      </h2>
      <div className="rounded-md border">
        {months.length === 0 ? (
          <div className="text-muted-foreground p-4 text-sm">
            {intl.get('data_quality.pl_cashflow.empty')}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">
                  {intl.get('data_quality.pl_cashflow.col.month')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('data_quality.pl_cashflow.col.pl_income')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('data_quality.pl_cashflow.col.pl_expense')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('data_quality.pl_cashflow.col.pl_net')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('data_quality.pl_cashflow.col.cash_in')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('data_quality.pl_cashflow.col.cash_out')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('data_quality.pl_cashflow.col.cash_net')}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {intl.get('data_quality.pl_cashflow.col.diff')}
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => {
                const hasDiff = (row.diff ?? 0) !== 0;
                return (
                  <tr
                    key={row.month}
                    className={
                      'border-b last:border-0' +
                      (hasDiff ? ' bg-amber-500/10' : '')
                    }
                  >
                    <td className="px-4 py-2">{fmtMonth(row.month)}</td>
                    <td className="px-4 py-2 text-right">
                      {fmt(row.plIncome)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmt(row.plExpense)}
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      {fmt(row.plNet)}
                    </td>
                    <td className="px-4 py-2 text-right">{fmt(row.cashIn)}</td>
                    <td className="px-4 py-2 text-right">{fmt(row.cashOut)}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      {fmt(row.cashNet)}
                    </td>
                    <td
                      className={
                        'px-4 py-2 text-right font-medium' +
                        (hasDiff ? ' text-amber-700' : '')
                      }
                    >
                      {fmt(row.diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td className="px-4 py-2">
                  {intl.get('data_quality.pl_cashflow.totals')}
                </td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-right">{fmt(totals.plNet)}</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-right">{fmt(totals.cashNet)}</td>
                <td
                  className={
                    'px-4 py-2 text-right' +
                    ((totals.diff ?? 0) !== 0 ? ' text-amber-700' : '')
                  }
                >
                  {fmt(totals.diff)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.pl_cashflow.note')}
      </p>
    </div>
  );
}
