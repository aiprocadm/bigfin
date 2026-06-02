import React from 'react';
import intl from 'react-intl-universal';
import { useBudgetPlanFact } from '@/hooks/query/budgets';

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
  const { data } = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario },
    {},
  );
  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-2">
      {type === 'bdds' && (
        <p className="text-xs text-gray-500">
          {intl.get('budgets.planfact.bdds_hint')}
        </p>
      )}
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
            <td className="px-2 py-1 text-right">
              {r.plan.toLocaleString('ru-RU')}
            </td>
            <td className="px-2 py-1 text-right">
              {r.fact.toLocaleString('ru-RU')}
            </td>
            <td
              className={`px-2 py-1 text-right ${
                r.varianceAbs < 0 ? 'text-red-600' : ''
              }`}
            >
              {r.varianceAbs.toLocaleString('ru-RU')}
            </td>
            <td className="px-2 py-1 text-right">
              {r.variancePct == null ? '—' : `${r.variancePct}%`}
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}
