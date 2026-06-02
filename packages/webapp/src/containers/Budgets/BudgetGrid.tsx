import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useBudget, useUpsertBudgetLines } from '@/hooks/query/budgets';

const MONTHS = Array.from({ length: 12 }, (_, i) => i); // 0..11

const periodOf = (year: number, monthIdx: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;

export function BudgetGrid({
  budgetId,
  scenario,
}: {
  budgetId: number;
  scenario: string;
}) {
  const { data: budget } = useBudget(budgetId, {});
  const { data: tree } = useManagementArticles({ tree: 'true' }, {});
  const upsert = useUpsertBudgetLines({});

  const year = budget?.fiscalYear ?? new Date().getFullYear();

  // Карта сумм всех сценариев: `${scenario}:${articleId}:${period}` → amount.
  const initial = React.useMemo(() => {
    const m: Record<string, number> = {};
    (budget?.lines ?? []).forEach((l: any) => {
      m[`${l.scenario}:${l.articleId}:${String(l.period).slice(0, 10)}`] =
        Number(l.plannedAmount);
    });
    return m;
  }, [budget]);

  const [edits, setEdits] = React.useState<Record<string, number>>({});
  const [compare, setCompare] = React.useState(false);
  const valueAt = (articleId: number, period: string) => {
    const key = `${scenario}:${articleId}:${period}`;
    return edits[key] ?? initial[key] ?? 0;
  };
  const setCell = (articleId: number, period: string, v: number) =>
    setEdits((p) => ({ ...p, [`${scenario}:${articleId}:${period}`]: v }));

  const flatten = (nodes: any[], acc: any[] = []): any[] => {
    (nodes ?? []).forEach((n) => {
      acc.push(n);
      if (n.children?.length) flatten(n.children, acc);
    });
    return acc;
  };
  const rows = flatten(tree);

  // Σ по строке (12 месяцев) и план-прибыль по месяцу (только листья:
  // доходы плюсом, расходы минусом). Для БДДС читается как чистый поток.
  const rowTotal = (articleId: number) =>
    MONTHS.reduce((s, m) => s + valueAt(articleId, periodOf(year, m)), 0);
  const monthProfit = (monthIdx: number) => {
    const period = periodOf(year, monthIdx);
    return rows.reduce((sum: number, a: any) => {
      if (a.children?.length) return sum; // агрегаты-родители не суммируем
      const v = valueAt(a.id, period);
      if (a.kind === 'income') return sum + v;
      if (a.kind === 'expense') return sum - v;
      return sum;
    }, 0);
  };

  // Годовой план по статье и сценарию (для режима «Сравнить сценарии»).
  const annualTotal = (articleId: number, sc: string) =>
    (budget?.lines ?? [])
      .filter((l: any) => l.articleId === articleId && l.scenario === sc)
      .reduce((s: number, l: any) => s + Number(l.plannedAmount), 0);

  const onSave = () => {
    const lines = Object.entries(edits).map(([key, plannedAmount]) => {
      const [sc, articleId, period] = key.split(':');
      return {
        articleId: Number(articleId),
        period,
        scenario: sc,
        plannedAmount,
      };
    });
    if (lines.length) upsert.mutate([budgetId, { lines }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end gap-2">
        <Button
          variant={compare ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setCompare((v) => !v)}
        >
          {intl.get('budgets.compare_scenarios')}
        </Button>
        {!compare && (
          <Button onClick={onSave}>{intl.get('budgets.save')}</Button>
        )}
      </div>
      {compare ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">
                  {intl.get('management_articles.field.name')}
                </th>
                {SCENARIOS.map((s) => (
                  <th key={s} className="px-2 py-1 text-right">
                    {intl.get(`budgets.scenario.${s}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((article: any) => (
                <tr key={article.id} className="border-t">
                  <td className="px-2 py-1">{article.name}</td>
                  {SCENARIOS.map((s) => (
                    <td key={s} className="px-2 py-1 text-right">
                      {annualTotal(article.id, s).toLocaleString('ru-RU')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">
                {intl.get('management_articles.field.name')}
              </th>
              {MONTHS.map((m) => (
                <th key={m} className="px-2 py-1 text-right">
                  {m + 1}
                </th>
              ))}
              <th className="px-2 py-1 text-right">
                {intl.get('budgets.total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((article: any) => (
              <tr key={article.id} className="border-t">
                <td className="px-2 py-1">{article.name}</td>
                {MONTHS.map((m) => {
                  const period = periodOf(year, m);
                  return (
                    <td key={m} className="px-1 py-1">
                      <Input
                        type="number"
                        className="w-24 text-right"
                        value={valueAt(article.id, period)}
                        onChange={(e) =>
                          setCell(article.id, period, Number(e.target.value))
                        }
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-right font-medium">
                  {rowTotal(article.id).toLocaleString('ru-RU')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-medium">
              <td className="px-2 py-1">
                {intl.get('budgets.profit_plan')}
              </td>
              {MONTHS.map((m) => (
                <td key={m} className="px-2 py-1 text-right">
                  {monthProfit(m).toLocaleString('ru-RU')}
                </td>
              ))}
              <td className="px-2 py-1 text-right">
                {MONTHS.reduce((s, m) => s + monthProfit(m), 0).toLocaleString(
                  'ru-RU',
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      )}
    </div>
  );
}
