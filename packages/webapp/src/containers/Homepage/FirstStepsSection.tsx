import * as React from 'react';
import intl from 'react-intl-universal';

import { useOnboardingStatus } from '@/hooks/query/onboarding';
import { summarizeOnboarding } from '@/components/Dashboard/Onboarding/onboarding';
import { OnboardingChecklist } from '@/components/Dashboard/Onboarding/OnboardingProgress';

/**
 * Чек-лист «первые шаги» на главной.
 *
 * ОДИН СПИСОК С ШАПКОЙ (решение R25 ТЗ-4, UI-045-6). Раньше здесь жил свой
 * список из пяти шагов (контрагент, товар, счёт, оплата, банковский счёт),
 * посчитанный витриной, а в шапке — серверный из восьми. Шапка говорила
 * «7 из 8», главная — «2 из 5», и человек не понимал, каким верить. Теперь
 * оба места читают один ответ сервера (`dashboard/onboarding`) и рисуют один
 * и тот же список — с «Пропустить» и «Вернуть».
 *
 * Когда всё сделано, секция исчезает целиком, чтобы не мозолить глаза
 * опытным; с пропущенными шагами — остаётся, чтобы их можно было вернуть.
 */
export default function FirstStepsSection() {
  const { data: steps, isLoading } = useOnboardingStatus();
  const list = steps ?? [];
  const summary = summarizeOnboarding(list);

  if (isLoading || list.length === 0 || summary.complete) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-headline text-text-primary">
          {intl.get('homepage.first_steps.title')}
        </h2>
        <span className="text-footnote text-text-secondary">
          {intl.get('onboarding.counter', {
            done: summary.done,
            total: summary.total,
          })}
        </span>
      </div>

      <div className="overflow-hidden rounded-default border border-border bg-surface">
        <OnboardingChecklist steps={list} />
      </div>

      <p className="text-footnote text-text-secondary">
        {intl.get('homepage.first_steps.hint')}
      </p>
    </section>
  );
}
