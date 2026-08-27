// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import {
  BreakEvenResult,
  ExpenseArticle,
  useExpenseArticles,
  useSetCostBehavior,
} from '@/hooks/query/financialModel';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const fmtMoney = (n: number | null | undefined) =>
  formatOrganizationMoney(n ?? 0);
const fmtPct = (frac: number | null | undefined) =>
  `${Math.round((frac ?? 0) * 1000) / 10}%`;

const btn = 'rounded border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50';
const btnActive = 'bg-primary text-primary-foreground hover:bg-primary';

export function BreakEvenPanel({ breakEven }: { breakEven?: BreakEvenResult }) {
  const { data: articles } = useExpenseArticles();
  const setBehavior = useSetCostBehavior();

  const list: ExpenseArticle[] = articles ?? [];
  const be = breakEven;

  // Прогресс к безубыточности: текущая выручка ÷ выручка безубыточности (0..1).
  const target = be?.breakEven?.applicable ? be.breakEven.value : 0;
  const progress =
    target > 0 ? Math.min(1, (be?.revenue ?? 0) / target) : 0;
  const reached = target > 0 && (be?.revenue ?? 0) >= target;

  const setOne = (id: number, behavior: 'fixed' | 'variable' | null) =>
    setBehavior.mutate([id, behavior]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mt-2 text-lg font-semibold">
        {intl.get('financial_model.breakeven.title')}
      </h2>

      {/* Сводка + визуализация */}
      <div className="flex flex-col gap-3 rounded-md border p-4">
        {!be?.hasFixedArticles ? (
          <div className="py-2 text-sm text-muted-foreground">
            {intl.get('financial_model.breakeven.hint_mark')}
          </div>
        ) : !be?.breakEven?.applicable ? (
          <div className="py-2 text-sm text-amber-600">
            {intl.get('financial_model.breakeven.unreachable')}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">
                  {intl.get('financial_model.breakeven.fixed_costs')}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {fmtMoney(be.fixedCosts)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">
                  {intl.get('financial_model.metric.margin')}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {fmtPct(be.margin)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">
                  {intl.get('financial_model.breakeven.revenue_label')}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {fmtMoney(be.breakEven.value)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">
                  {intl.get('financial_model.breakeven.current_revenue')}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {fmtMoney(be.revenue)}
                </span>
              </div>
            </div>

            {/* Полоса прогресса: текущая выручка относительно точки безубыточности */}
            <div className="flex flex-col gap-1">
              <div className="h-3 w-full overflow-hidden rounded bg-muted">
                <div
                  className={`h-full ${reached ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {reached
                  ? intl.get('financial_model.breakeven.reached')
                  : `${intl.get('financial_model.breakeven.progress')}: ${Math.round(progress * 100)}%`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Пометка статей постоянная/переменная */}
      <div className="rounded-md border p-4">
        <div className="mb-2 text-sm font-medium">
          {intl.get('financial_model.breakeven.mark_title')}
        </div>
        {list.length === 0 ? (
          <div className="py-2 text-sm text-muted-foreground">
            {intl.get('financial_model.breakeven.empty_articles')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-1 font-normal">
                    {intl.get('financial_model.breakeven.article')}
                  </th>
                  <th className="px-2 py-1 text-right font-normal">
                    {intl.get('financial_model.breakeven.behavior')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-2 py-1">
                      {a.parentId != null && (
                        <span className="text-muted-foreground">— </span>
                      )}
                      {a.name}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right">
                      <button
                        className={`${btn} mr-1 ${a.costBehavior === 'fixed' ? btnActive : ''}`}
                        onClick={() => setOne(a.id, 'fixed')}
                      >
                        {intl.get('financial_model.breakeven.fixed')}
                      </button>
                      <button
                        className={`${btn} mr-1 ${a.costBehavior === 'variable' ? btnActive : ''}`}
                        onClick={() => setOne(a.id, 'variable')}
                      >
                        {intl.get('financial_model.breakeven.variable')}
                      </button>
                      <button
                        className={`${btn} ${a.costBehavior == null ? btnActive : ''}`}
                        onClick={() => setOne(a.id, null)}
                      >
                        {intl.get('financial_model.breakeven.clear')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
