import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { useBudgetPlanFact } from '@/hooks/query/budgets';
import { BudgetPlanFactCompare } from './BudgetPlanFactCompare';
import { fmt, fmtPct } from './budgetFormatters';

export function BudgetPlanFact({
  budgetId,
  fromDate,
  toDate,
  scenario,
}: {
  budgetId: number;
  fromDate: string;
  toDate: string;
  scenario: string;
}) {
  const [compare, setCompare] = React.useState(false);
  const { data } = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario },
    {},
  );
  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          variant={compare ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setCompare((v) => !v)}
        >
          {intl.get('budgets.planfact.compare')}
        </Button>
      </div>

      {compare ? (
        <BudgetPlanFactCompare
          budgetId={budgetId}
          fromDate={fromDate}
          toDate={toDate}
        />
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">
                {intl.get('management_articles.field.name')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_plan')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_fact')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_variance_abs')}
              </th>
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.planfact.col_variance_pct')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.articleId} className="border-t">
                <td className="px-2 py-1">{r.name}</td>
                <td className="px-2 py-1 text-right">{fmt(r.plan)}</td>
                <td className="px-2 py-1 text-right">{fmt(r.fact)}</td>
                <td
                  className={`px-2 py-1 text-right ${
                    r.varianceAbs < 0 ? 'text-red-600' : ''
                  }`}
                >
                  {fmt(r.varianceAbs)}
                </td>
                <td className="px-2 py-1 text-right">{fmtPct(r.variancePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
