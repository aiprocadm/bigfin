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
import { ModuleDisabled } from '@/components/ui/module-disabled';
import { useLocation } from 'react-router-dom';
import { openIdFromSearch } from '@/containers/UniversalSearch/openFromSearch';

const SCENARIOS = ['optimistic', 'realistic', 'pessimistic'] as const;

export default function BudgetsPage() {
  const { featureCan } = useFeatureCan();
  const { data: budgets } = useBudgets({});
  const [showForm, setShowForm] = React.useState(false);
  const [selected, setSelected] = React.useState<Budget | undefined>();
  const [tab, setTab] = React.useState<'grid' | 'planfact'>('grid');
  const { search } = useLocation();

  // Карта v48. Поиск в шапке приводит сюда с номером найденного бюджета:
  // открываем его, а не оставляем человека в общем списке.
  const requestedId = openIdFromSearch(search);
  const requestedBudget =
    requestedId !== null
      ? (budgets ?? []).find((b: Budget) => b.id === requestedId)
      : undefined;
  const shownBudget = selected ?? requestedBudget;
  const [scenario, setScenario] = React.useState('realistic');
  const [month, setMonth] = React.useState<string>(''); // '' = весь финансовый год, иначе 'YYYY-MM'

  if (!featureCan('budgets')) return <ModuleDisabled />;

  const year = shownBudget?.fiscalYear ?? moment().year();
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

      {shownBudget && (
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
            {/* На телефоне три кнопки в строку не помещаются: ряд занимал
                421 px при экране 390, и «Пессимистичный» обрезало
                посередине. Переносим на вторую строку (И2 карты v33). */}
            <div className="flex flex-wrap items-center gap-1">
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
            <BudgetGrid budgetId={shownBudget.id} scenario={scenario} />
          ) : (
            <BudgetPlanFact
              budgetId={shownBudget.id}
              fromDate={pfFrom}
              toDate={pfTo}
              scenario={scenario}
              type={shownBudget.type}
            />
          )}
        </div>
      )}
    </div>
  );
}
