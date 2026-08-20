import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { useFirstStepsStatus } from './useFirstStepsStatus';

/**
 * Чек-лист «первые шаги» (Р4 карты v16, вопрос 23).
 *
 * Главная новой организации выглядела так же, как у организации с годовым
 * оборотом. Отметки считаются по настоящим данным (заведён контрагент,
 * товар, счёт, получена оплата, добавлен банковский счёт) — и когда всё
 * сделано, секция исчезает целиком, чтобы не мозолить глаза опытным.
 */
export default function FirstStepsSection() {
  const { steps, doneCount, allDone, isLoading } = useFirstStepsStatus();

  if (isLoading || allDone) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          {intl.get('homepage.first_steps.title')}
        </h2>
        <span className="text-xs text-text-secondary">
          {intl.get('homepage.first_steps.progress', {
            done: doneCount,
            total: steps.length,
          })}
        </span>
      </div>

      <div className="flex flex-col divide-y rounded-xl border border-border bg-surface">
        {steps.map((step) => (
          <Link
            key={step.key}
            to={step.href}
            className="group flex items-center gap-3 p-3 transition-colors hover:bg-surface-elevated"
          >
            <span
              aria-hidden
              className={
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ' +
                (step.done
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-border text-transparent')
              }
            >
              ✓
            </span>
            <span
              className={
                'text-sm ' +
                (step.done
                  ? 'text-text-secondary line-through'
                  : 'text-text-primary')
              }
            >
              {intl.get(step.labelKey)}
            </span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-text-secondary">
        {intl.get('homepage.first_steps.hint')}
      </p>
    </section>
  );
}
