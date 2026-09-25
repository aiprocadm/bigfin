import * as React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';

import { cn } from '@/lib/cn';
import { ProgressBar, ProgressRing, formatShare } from '@/components/ui/progress';
import { useBudgetPlanFact } from '@/hooks/query/budgets';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import type { Budget } from './schemas';

/**
 * Доля прошедшего времени финансового года бюджета на сегодня: 0 до начала
 * года, 1 после конца. С ней сравнивают освоение: 60 % бюджета к июлю — рано,
 * к ноябрю — нормально.
 */
export function elapsedShare(fiscalYear: number, today = moment()): number {
  const start = moment(`${fiscalYear}-01-01`);
  const end = moment(`${fiscalYear}-12-31`).endOf('day');
  if (today.isBefore(start)) return 0;
  if (today.isAfter(end)) return 1;
  return today.diff(start, 'days') / end.diff(start, 'days');
}

/**
 * Карточка бюджета (C12, UI-050-2 ТЗ-4) — вместо подчёркнутой ссылки на
 * пустой странице (O11).
 *
 * Кольцо — освоение расходов из расчёта сервера («освоено X из Y»), полоса —
 * сколько прошло года. Вместе они отвечают на «идём по бюджету?» за
 * секунду, до открытия самого бюджета.
 */
export function BudgetCard({
  budget,
  selected,
  onOpen,
}: {
  budget: Budget;
  selected?: boolean;
  onOpen: () => void;
}) {
  const { data } = useBudgetPlanFact(
    budget.id,
    { fromDate: `${budget.fiscalYear}-01-01`, toDate: `${budget.fiscalYear}-12-31`, scenario: budget.activeScenario ?? 'realistic' },
    {},
  );
  const usage = (data as any)?.expense_usage ?? (data as any)?.expenseUsage ?? null;
  const share = usage?.percent == null ? null : Number(usage.percent) / 100;
  const elapsed = elapsedShare(budget.fiscalYear);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center gap-4 rounded-default border bg-surface p-4 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
        selected ? 'border-action' : 'border-border hover:bg-fill-1/60',
      )}
    >
      <ProgressRing
        size={64}
        thickness={7}
        rings={[{ label: intl.get('budgets.card.usage'), value: share, tone: 'chart-1' }]}
      >
        <span className="text-caption tabular-nums text-text-primary">{share === null ? '—' : formatShare(share)}</span>
      </ProgressRing>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-headline text-text-primary">{budget.name}</span>
        <span className="text-subhead text-text-secondary">
          {intl.get(`budgets.type.${budget.type}`)} · {budget.fiscalYear}
        </span>
        {usage && (
          <span className="text-footnote text-text-secondary">
            {intl.get('budgets.card.used', {
              fact: formatOrganizationMoney(Number(usage.fact) || 0),
              plan: formatOrganizationMoney(Number(usage.plan) || 0),
            })}
          </span>
        )}
        <ProgressBar
          className="mt-1"
          label={intl.get('budgets.card.elapsed')}
          value={elapsed}
          tone="chart-3"
        />
      </div>
    </button>
  );
}
