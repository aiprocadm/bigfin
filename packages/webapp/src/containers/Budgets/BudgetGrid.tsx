import React from 'react';
import intl from 'react-intl-universal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useBudget, useUpsertBudgetLines } from '@/hooks/query/budgets';

const MONTHS = Array.from({ length: 12 }, (_, i) => i); // 0..11

const periodOf = (year: number, monthIdx: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;

export function BudgetGrid({ budgetId }: { budgetId: number }) {
  const { data: budget } = useBudget(budgetId, {});
  const { data: tree } = useManagementArticles({ tree: 'true' }, {});
  const upsert = useUpsertBudgetLines({});

  const scenario = budget?.activeScenario ?? 'realistic';
  const year = budget?.fiscalYear ?? new Date().getFullYear();

  // Карта существующих сумм: `${articleId}:${period}` → amount.
  const initial = React.useMemo(() => {
    const m: Record<string, number> = {};
    (budget?.lines ?? [])
      .filter((l: any) => l.scenario === scenario)
      .forEach((l: any) => {
        m[`${l.articleId}:${String(l.period).slice(0, 10)}`] = Number(
          l.plannedAmount,
        );
      });
    return m;
  }, [budget, scenario]);

  const [edits, setEdits] = React.useState<Record<string, number>>({});
  const valueAt = (articleId: number, period: string) => {
    const key = `${articleId}:${period}`;
    return edits[key] ?? initial[key] ?? 0;
  };
  const setCell = (articleId: number, period: string, v: number) =>
    setEdits((p) => ({ ...p, [`${articleId}:${period}`]: v }));

  const flatten = (nodes: any[], acc: any[] = []): any[] => {
    (nodes ?? []).forEach((n) => {
      acc.push(n);
      if (n.children?.length) flatten(n.children, acc);
    });
    return acc;
  };
  const rows = flatten(tree);

  const onSave = () => {
    const lines = Object.entries(edits).map(([key, plannedAmount]) => {
      const [articleId, period] = key.split(':');
      return { articleId: Number(articleId), period, scenario, plannedAmount };
    });
    if (lines.length) upsert.mutate([budgetId, { lines }]);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button onClick={onSave}>{intl.get('budgets.save')}</Button>
      </div>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
