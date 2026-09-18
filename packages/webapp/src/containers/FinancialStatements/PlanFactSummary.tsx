// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { formattedAmount } from '@/utils';

import { formatVariance } from './planFactColumns';
import { isVarianceGood, planFactSummaryRows } from './planFactSummary';
import { useReportPlanFact } from './useReportPlanFact';

interface PlanFactSummaryProps {
  report: 'profit_loss' | 'cash_flow';
  fromDate?: string;
  toDate?: string;
}

/**
 * Сводка «план и факт» над таблицей отчёта (этап 4 ТЗ, п. 4.4).
 *
 * В ДДС колонок «План» быть не может: строки отчёта — балансовые счета,
 * а бюджет разложен по статьям доходов и расходов, и общего у них ничего
 * нет. Зато сходятся итоги: сколько денег планировали получить и потратить
 * и сколько получили и потратили на самом деле.
 *
 * Нет бюджета на период — блока нет вовсе, отчёт выглядит как раньше.
 */
export default function PlanFactSummary({
  report,
  fromDate,
  toDate,
}: PlanFactSummaryProps) {
  const planFact = useReportPlanFact(report, fromDate, toDate);
  const rows = planFactSummaryRows(planFact);

  if (rows.length === 0) return null;

  const money = (value: number) => formattedAmount(value, '');

  return (
    <section className="mb-4 rounded-md border border-border p-4">
      <h3 className="mb-3 text-sm font-medium text-text-primary">
        {intl.get('reports.plan_fact.summary_title')}
        {planFact?.budgetName ? ` — ${planFact.budgetName}` : ''}
      </h3>

      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const good = isVarianceGood(row.side, row.varianceAbs);

          return (
            <div
              key={row.side}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm"
            >
              <span className="min-w-32 text-text-primary">
                {intl.get(row.labelKey)}
              </span>

              <span className="text-text-muted">
                {intl.get('reports.plan_fact.plan')}:{' '}
                <span className="tabular-nums text-text-primary">
                  {money(row.plan)}
                </span>
              </span>

              <span className="text-text-muted">
                {intl.get('reports.plan_fact.fact')}:{' '}
                <span className="tabular-nums text-text-primary">
                  {money(row.fact)}
                </span>
              </span>

              <span className="text-text-muted">
                {intl.get('reports.plan_fact.variance')}:{' '}
                <span
                  className={cn(
                    'tabular-nums',
                    // Перерасход красным, экономия зелёным — по смыслу
                    // стороны, а не по знаку числа.
                    good === true && 'text-success',
                    good === false && 'text-danger',
                    good === null && 'text-text-primary',
                  )}
                >
                  {formatVariance(row.varianceAbs, row.variancePct, money)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
