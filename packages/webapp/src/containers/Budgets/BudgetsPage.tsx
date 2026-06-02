import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useFeatureCan } from '@/hooks/state/feature';
import { useBudgets } from '@/hooks/query/budgets';
import { BudgetFormDialog } from './BudgetFormDialog';
import { BudgetGrid } from './BudgetGrid';
import { BudgetPlanFact } from './BudgetPlanFact';
import { Budget } from './schemas';

export default function BudgetsPage() {
  const { featureCan } = useFeatureCan();
  const { data: budgets } = useBudgets({});
  const [showForm, setShowForm] = React.useState(false);
  const [selected, setSelected] = React.useState<Budget | undefined>();
  const [tab, setTab] = React.useState<'grid' | 'planfact'>('grid');
  const [scenario, setScenario] = React.useState('realistic');

  if (!featureCan('budgets')) return null;

  const year = selected?.fiscalYear ?? moment().year();
  const fromDate = `${year}-01-01`;
  const toDate = `${year}-12-31`;

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
              onClick={() => setSelected(b)}
            >
              {b.name} ({intl.get(`budgets.type.${b.type}`)}, {b.fiscalYear})
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
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
            </div>
            <div className="flex items-center gap-1">
              {(['optimistic', 'realistic', 'pessimistic'] as const).map(
                (s) => (
                  <Button
                    key={s}
                    variant={scenario === s ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setScenario(s)}
                  >
                    {intl.get(`budgets.scenario.${s}`)}
                  </Button>
                ),
              )}
            </div>
          </div>
          {tab === 'grid' ? (
            <BudgetGrid budgetId={selected.id} scenario={scenario} />
          ) : (
            <BudgetPlanFact
              budgetId={selected.id}
              fromDate={fromDate}
              toDate={toDate}
              scenario={scenario}
            />
          )}
        </div>
      )}
    </div>
  );
}
