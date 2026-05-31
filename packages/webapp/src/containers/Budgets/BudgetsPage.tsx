import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { useBudgets } from '@/hooks/query/budgets';
import { useBranches } from '@/hooks/query/branches';
import { BudgetFormDialog } from './BudgetFormDialog';
import { BudgetGrid } from './BudgetGrid';
import { BudgetPlanFact } from './BudgetPlanFact';
import { Budget } from './schemas';

const SCENARIOS = ['optimistic', 'realistic', 'pessimistic'] as const;

export default function BudgetsPage() {
  const { featureCan } = useFeatureCan();
  const { data: budgets } = useBudgets({});
  const [showForm, setShowForm] = React.useState(false);
  const [selected, setSelected] = React.useState<Budget | undefined>();
  const [tab, setTab] = React.useState<'grid' | 'planfact'>('grid');
  const [scenario, setScenario] = React.useState<string>('realistic');
  const [month, setMonth] = React.useState<string>(''); // '' = весь год, иначе 'YYYY-MM'
  const [branchId, setBranchId] = React.useState<number | ''>('');
  const { data: branches } = useBranches({}, {});

  if (!featureCan('budgets')) return null;

  const year = selected?.fiscalYear ?? moment().year();
  // Период план-факта: конкретный месяц или весь финансовый год.
  const pfFrom = month ? `${month}-01` : `${year}-01-01`;
  const pfTo = month
    ? moment(`${month}-01`).endOf('month').format('YYYY-MM-DD')
    : `${year}-12-31`;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('budgets.page_title')}
        </h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {intl.get('budgets.add')}
        </Button>
      </div>

      {showForm && (
        <BudgetFormDialog
          onDone={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      )}

      <ul className="flex flex-col gap-1">
        {(budgets ?? []).map((b: Budget) => (
          <li key={b.id}>
            <button
              className="text-left underline"
              onClick={() => {
                setSelected(b);
                setScenario(b.activeScenario ?? 'realistic');
              }}
            >
              {b.name} ({intl.get(`budgets.type.${b.type}`)}, {b.fiscalYear})
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={tab === 'grid' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab('grid')}
            >
              {intl.get('budgets.page_title')}
            </Button>
            <Button
              variant={tab === 'planfact' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setTab('planfact')}
            >
              {intl.get('budgets.planfact.title')}
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm">
              {intl.get('budgets.field.scenario')}
              <select
                className="rounded-md border px-2 py-1"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
              >
                {SCENARIOS.map((s) => (
                  <option key={s} value={s}>
                    {intl.get(`budgets.scenario.${s}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {tab === 'grid' ? (
            <BudgetGrid budgetId={selected.id} scenario={scenario} />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="flex items-center gap-2">
                  {intl.get('budgets.planfact.period')}
                  <input
                    type="month"
                    className="rounded-md border px-2 py-1"
                    min={`${year}-01`}
                    max={`${year}-12`}
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  />
                  {month && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMonth('')}
                    >
                      {intl.get('budgets.planfact.all_year')}
                    </Button>
                  )}
                </label>
                {Array.isArray(branches) && branches.length > 0 && (
                  <label className="flex items-center gap-2">
                    {intl.get('budgets.planfact.direction')}
                    <select
                      className="rounded-md border px-2 py-1"
                      value={branchId}
                      onChange={(e) =>
                        setBranchId(
                          e.target.value ? Number(e.target.value) : '',
                        )
                      }
                    >
                      <option value="">
                        {intl.get('budgets.planfact.all_directions')}
                      </option>
                      {branches.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <BudgetPlanFact
                budgetId={selected.id}
                fromDate={pfFrom}
                toDate={pfTo}
                scenario={scenario}
                type={selected.type}
                branchesIds={branchId ? [branchId] : undefined}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
