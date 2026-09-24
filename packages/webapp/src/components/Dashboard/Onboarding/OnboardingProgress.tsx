import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import { Check, CheckCircle2, ListChecks, Minus } from 'lucide-react';

import { cn } from '@/lib/cn';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useOnboardingStatus,
  useSetOnboardingSkipped,
} from '@/hooks/query/onboarding';
import { OnboardingStepView, summarizeOnboarding } from './onboarding';
import { useOnboardingAutoRefresh } from './useOnboardingAutoRefresh';

/**
 * Онбординг в шапке: «N из M» и чек-лист первых шагов (FT-095 ТЗ-3).
 *
 * ПОЧЕМУ В ШАПКЕ, А НЕ ТОЛЬКО НА ГЛАВНОЙ. Прогресс виден с любого экрана:
 * человек сделал шаг там, куда его привела ссылка, — и тут же видит, что
 * счётчик вырос, не возвращаясь на главную.
 *
 * ПРОПУСК ОБРАТИМ. У Финтабло «Пропустить» — навсегда: нажал по ошибке —
 * шаг потерян. Здесь пропущенный шаг остаётся в том же списке с кнопкой
 * «Вернуть».
 *
 * КОГДА ВСЁ ЗАКРЫТО. Всё сделано без пропусков — счётчик исчезает: вернуть
 * нечего, а место в шапке дорогое, особенно на телефоне. Если же часть
 * шагов пропущена — остаётся тихое «Готово»: иначе пропущенный шаг нельзя
 * было бы вернуть, а это и есть главное отличие от Финтабло.
 */
export function OnboardingProgress() {
  const { data: steps } = useOnboardingStatus();
  const setSkipped = useSetOnboardingSkipped();
  const [open, setOpen] = React.useState(false);

  const list = steps ?? [];
  const summary = summarizeOnboarding(list);
  const reportDone = Boolean(list.find((s) => s.key === 'report')?.done);

  useOnboardingAutoRefresh({
    active: list.length > 0 && !summary.complete,
    reportDone,
  });

  if (list.length === 0 || summary.mode === 'hidden') return null;

  const counter = intl.get('onboarding.counter', {
    done: summary.done,
    total: summary.total,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {summary.mode === 'ready' ? (
          <button
            type="button"
            aria-label={intl.get('onboarding.ready_aria')}
            className="flex h-11 items-center gap-1.5 rounded-control px-2 text-xs text-text-muted hover:bg-surface-elevated sm:h-8"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">
              {intl.get('onboarding.ready')}
            </span>
          </button>
        ) : (
          <button
            type="button"
            aria-label={intl.get('onboarding.counter_aria', {
              done: summary.done,
              total: summary.total,
            })}
            className="flex h-11 items-center gap-1.5 rounded-control px-2 text-xs font-medium text-text-primary hover:bg-surface-elevated sm:h-8"
          >
            <ListChecks className="h-4 w-4 text-action" aria-hidden />
            <span className="tabular-nums">
              {/* На телефоне — «3/8»: слово «из» съедало бы место у поиска. */}
              <span className="sm:hidden">
                {summary.done}/{summary.total}
              </span>
              <span className="hidden sm:inline">{counter}</span>
            </span>
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 max-w-[92vw] p-0">
        <div className="flex flex-col gap-2 border-b border-border p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {intl.get('onboarding.title')}
            </h3>
            <span className="text-xs tabular-nums text-text-muted">
              {counter}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-elevated"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-action transition-all"
              style={{
                width: `${
                  summary.total ? (summary.done / summary.total) * 100 : 100
                }%`,
              }}
            />
          </div>
          {summary.mode === 'ready' && (
            <p className="text-xs text-text-muted">
              {intl.get('onboarding.ready_hint')}
            </p>
          )}
        </div>

        <ul className="flex flex-col divide-y divide-border">
          {list.map((step) => (
            <OnboardingStepRow
              key={step.key}
              step={step}
              busy={setSkipped.isLoading}
              onNavigate={() => setOpen(false)}
              onSkip={(skip) => setSkipped.mutate({ key: step.key, skip })}
            />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function OnboardingStepRow({
  step,
  busy,
  onNavigate,
  onSkip,
}: {
  step: OnboardingStepView;
  busy: boolean;
  onNavigate: () => void;
  onSkip: (skip: boolean) => void;
}) {
  return (
    <li className="flex min-h-11 items-center gap-3 px-4 py-2">
      <span
        aria-hidden
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
          step.done && 'border-success bg-success text-white',
          step.skipped && 'border-border text-text-muted',
          !step.done && !step.skipped && 'border-border',
        )}
      >
        {step.done && <Check className="h-3 w-3" />}
        {step.skipped && <Minus className="h-3 w-3" />}
      </span>

      <Link
        to={step.href}
        onClick={onNavigate}
        className={cn(
          'min-w-0 flex-1 text-sm hover:underline',
          step.done && 'text-text-muted line-through',
          step.skipped && 'text-text-muted',
          !step.done && !step.skipped && 'text-text-primary',
        )}
      >
        {intl.get(step.labelKey)}
        {step.skipped && (
          <span className="sr-only"> — {intl.get('onboarding.skipped')}</span>
        )}
      </Link>

      {/* Сделанный шаг пропускать незачем — кнопки нет. */}
      {!step.done && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSkip(!step.skipped)}
          className="shrink-0 rounded-control px-2 py-1 text-xs text-text-muted hover:bg-surface-elevated hover:text-text-primary disabled:opacity-50"
        >
          {step.skipped
            ? intl.get('onboarding.return')
            : intl.get('onboarding.skip')}
        </button>
      )}
    </li>
  );
}
