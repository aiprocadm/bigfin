import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

/** Цвет срока: 90+ дней — единственный цвет проблемы (C16 ТЗ-4). */
const TONE = ['bg-chart-1', 'bg-chart-3', 'bg-chart-5', 'bg-chart-problem'] as const;
const LABELS = ['debts.aging.0_30', 'debts.aging.31_60', 'debts.aging.61_90', 'debts.aging.90_plus'];

/**
 * «Сроки долгов» (C16, UI-051-2 ТЗ-4): одна горизонтальная полоса 100 %,
 * разрезанная на 0–30 / 31–60 / 61–90 / 90+ дней, и суммы под ней.
 *
 * БЫЛО (O13): четыре мелкие плитки с числами — какая доля долга уже
 * «протухла», приходилось считать в уме. Полоса отвечает сразу; 90+ —
 * цветом проблемы, остальное спокойными.
 */
export function DebtAgingBar({ buckets }: { buckets: number[] }) {
  const total = buckets.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0) return null;

  return (
    <section aria-labelledby="debts-aging-title" className="flex flex-col gap-2">
      <h2 id="debts-aging-title" className="text-headline text-text-primary">
        {intl.get('debts.aging.title')}
      </h2>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-fill-1" role="img" aria-label={intl.get('debts.aging.title')}>
        {buckets.map((value, index) =>
          value > 0 ? (
            <div
              key={LABELS[index]}
              className={cn('h-full', TONE[index])}
              style={{ width: `${(value / total) * 100}%` }}
              title={`${intl.get(LABELS[index])}: ${formatOrganizationMoney(value)}`}
            />
          ) : null,
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {buckets.map((value, index) => (
          <li key={LABELS[index]} className="flex items-start gap-2">
            <span aria-hidden className={cn('mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full', TONE[index])} />
            <span className="flex flex-col">
              <span className="text-footnote text-text-secondary">{intl.get(LABELS[index])}</span>
              <span className={cn('text-subhead font-medium tabular-nums', index === 3 && value > 0 ? 'text-danger' : 'text-text-primary')}>
                {formatOrganizationMoney(value)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
