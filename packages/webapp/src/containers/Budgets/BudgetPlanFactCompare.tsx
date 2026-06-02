import React from 'react';
import intl from 'react-intl-universal';
import { useBudgetPlanFact } from '@/hooks/query/budgets';
import { mergePlanFactScenarios, ScenarioKey } from './mergePlanFactScenarios';

const SCENARIOS: ScenarioKey[] = ['optimistic', 'realistic', 'pessimistic'];

const fmt = (n: number) => n.toLocaleString('ru-RU');
const pct = (v: number | null) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v}%`);

export function BudgetPlanFactCompare({
  budgetId,
  fromDate,
  toDate,
}: {
  budgetId: number;
  fromDate: string;
  toDate: string;
}) {
  const opt = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario: 'optimistic' },
    {},
  );
  const real = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario: 'realistic' },
    {},
  );
  const pes = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario: 'pessimistic' },
    {},
  );

  const rows = React.useMemo(
    () =>
      mergePlanFactScenarios({
        optimistic: opt.data?.rows ?? [],
        realistic: real.data?.rows ?? [],
        pessimistic: pes.data?.rows ?? [],
      }),
    [opt.data, real.data, pes.data],
  );

  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr>
          <th className="px-2 py-1 text-left">
            {intl.get('management_articles.field.name')}
          </th>
          <th className="px-2 py-1 text-right">
            {intl.get('budgets.planfact.col_fact')}
          </th>
          {SCENARIOS.map((s) => (
            <th key={s} className="px-2 py-1 text-right">
              {intl.get(`budgets.scenario.${s}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.articleId} className="border-t">
            <td className="px-2 py-1">{r.name}</td>
            <td className="px-2 py-1 text-right font-semibold">{fmt(r.fact)}</td>
            {SCENARIOS.map((s) => (
              <td
                key={s}
                title={
                  r.closest === s
                    ? intl.get('budgets.planfact.closest')
                    : undefined
                }
                className={`px-2 py-1 text-right ${
                  r.closest === s ? 'bg-green-100 font-semibold' : ''
                }`}
              >
                {fmt(r.plans[s])}
                <span className="block text-xs text-gray-500">
                  {pct(r.deviations[s])}
                </span>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
