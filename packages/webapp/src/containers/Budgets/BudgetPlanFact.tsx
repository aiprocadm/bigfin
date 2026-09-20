import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { useBudgetPlanFact } from '@/hooks/query/budgets';
import { BudgetPlanFactCompare } from './BudgetPlanFactCompare';
import { fmt, fmtPct } from './budgetFormatters';
import {
  DEFAULT_PLAN_FACT_COLUMNS,
  PlanFactColumns,
  isColumnEnabled,
  togglePlanFactColumn,
} from './planFactColumns';

/** Колонки в том порядке, в котором их читают. */
const COLUMN_KEYS: Array<keyof PlanFactColumns> = [
  'fact',
  'completion',
  'varianceAbs',
  'variancePct',
];

export function BudgetPlanFact({
  budgetId,
  fromDate,
  toDate,
  scenario,
  type,
}: {
  budgetId: number;
  fromDate: string;
  toDate: string;
  scenario: string;
  type: 'bdir' | 'bdds';
}) {
  const [compare, setCompare] = React.useState(false);
  // ВЫБОР КОЛОНОК (FIN-021). Четыре числа про одно и то же рядом не
  // помещаются на телефоне, а нужны редко все сразу.
  const [columns, setColumns] = React.useState<PlanFactColumns>(
    DEFAULT_PLAN_FACT_COLUMNS,
  );
  const { data } = useBudgetPlanFact(
    budgetId,
    { fromDate, toDate, scenario },
    {},
  );
  const rows = data?.rows ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {COLUMN_KEYS.map((key) => {
            const enabled = isColumnEnabled(columns, key);

            return (
              <label
                key={key}
                className={`flex min-h-[44px] items-center gap-1.5 ${
                  enabled ? '' : 'text-text-muted'
                }`}
                title={
                  enabled
                    ? undefined
                    : intl.get('budgets.planfact.needs_fact')
                }
              >
                <input
                  type="checkbox"
                  checked={columns[key]}
                  disabled={!enabled}
                  onChange={() =>
                    setColumns((current) => togglePlanFactColumn(current, key))
                  }
                />
                {intl.get(`budgets.planfact.column.${key}`)}
              </label>
            );
          })}
        </div>

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
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">
                  {intl.get('management_articles.field.name')}
                </th>
                <th className="px-2 py-1 text-right">
                  {intl.get('budgets.planfact.col_plan')}
                </th>
                {columns.fact && (
                  <th className="px-2 py-1 text-right">
                    {intl.get('budgets.planfact.col_fact')}
                  </th>
                )}
                {columns.completion && (
                  <th className="px-2 py-1 text-right">
                    {intl.get('budgets.planfact.col_completion')}
                  </th>
                )}
                {columns.varianceAbs && (
                  <th className="px-2 py-1 text-right">
                    {intl.get('budgets.planfact.col_variance_abs')}
                  </th>
                )}
                {columns.variancePct && (
                  <th className="px-2 py-1 text-right">
                    {intl.get('budgets.planfact.col_variance_pct')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.articleId} className="border-t">
                  <td className="px-2 py-1">{r.name}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.plan)}</td>
                  {columns.fact && (
                    <td className="px-2 py-1 text-right">{fmt(r.fact)}</td>
                  )}
                  {columns.completion && (
                    <td className="px-2 py-1 text-right">
                      {/* Нулевой план — «н/о», а не ноль: делить не на что,
                          и ноль читался бы как «ничего не выполнено». */}
                      {Number(r.plan) === 0
                        ? intl.get('budgets.planfact.not_applicable')
                        : fmtPct((Number(r.fact) / Number(r.plan)) * 100)}
                    </td>
                  )}
                  {columns.varianceAbs && (
                    <td
                      className={`px-2 py-1 text-right ${
                        r.varianceAbs < 0 ? 'text-red-600' : ''
                      }`}
                    >
                      {fmt(r.varianceAbs)}
                    </td>
                  )}
                  {columns.variancePct && (
                    <td className="px-2 py-1 text-right">
                      {fmtPct(r.variancePct)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
