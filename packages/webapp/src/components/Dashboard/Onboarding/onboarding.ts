/**
 * Онбординг: прогресс в шапке (FT-095 ТЗ-3) — правила без React.
 *
 * Отметки «сделано» считает сервер (`GET dashboard/onboarding`) по данным
 * организации. Здесь — то, что витрине нужно поверх них: куда вести по
 * каждому шагу, как считать «N из M», когда прятать счётчик и как
 * пропустить или вернуть шаг, не дожидаясь ответа сервера.
 */
import t from '@/hooks/query/types';

export type OnboardingStepKey =
  | 'account'
  | 'statement'
  | 'articles'
  | 'rule'
  | 'bank'
  | 'team'
  | 'payment'
  | 'report';

export interface OnboardingStepMeta {
  key: OnboardingStepKey;
  /** Куда идти делать шаг: туда, где его и правда делают. */
  href: string;
  labelKey: string;
}

/** Порядок совпадает с сервером (`onboardingSteps.ts`). */
export const ONBOARDING_STEPS: OnboardingStepMeta[] = [
  {
    key: 'account',
    href: '/cashflow-accounts',
    labelKey: 'onboarding.step.account',
  },
  // Выписку загружают в конкретный счёт — поэтому ведём на список счетов:
  // загрузка живёт на странице операций выбранного счёта.
  {
    key: 'statement',
    href: '/cashflow-accounts',
    labelKey: 'onboarding.step.statement',
  },
  {
    key: 'articles',
    href: '/management-articles',
    labelKey: 'onboarding.step.articles',
  },
  { key: 'rule', href: '/bank-rules', labelKey: 'onboarding.step.rule' },
  { key: 'bank', href: '/bank-api-sync', labelKey: 'onboarding.step.bank' },
  { key: 'team', href: '/preferences/users', labelKey: 'onboarding.step.team' },
  {
    key: 'payment',
    href: '/payment-calendar',
    labelKey: 'onboarding.step.payment',
  },
  {
    key: 'report',
    href: '/financial-reports',
    labelKey: 'onboarding.step.report',
  },
];

export interface OnboardingStepState {
  key: OnboardingStepKey;
  done: boolean;
  skipped: boolean;
}

export type OnboardingStepView = OnboardingStepState & OnboardingStepMeta;

/**
 * Ответ сервера → шаги в порядке витрины.
 *
 * Шаг, которого сервер не прислал, показываем несделанным, а не прячем:
 * пропавшая строка чек-листа выглядит как «сделано», и человек не узнает,
 * что его ждёт ещё один шаг. Незнакомые сервером шаги отбрасываем — вести
 * по ним некуда.
 */
export function toStepViews(raw: unknown): OnboardingStepView[] {
  const list: any[] = Array.isArray((raw as any)?.steps)
    ? (raw as any).steps
    : [];

  return ONBOARDING_STEPS.map((meta) => {
    const found = list.find((step) => step?.key === meta.key);
    const done = Boolean(found?.done);
    return { ...meta, done, skipped: !done && Boolean(found?.skipped) };
  });
}

export interface OnboardingSummary {
  /** Сделано шагов (пропуск сделанным не считается). */
  done: number;
  /** Цель: все шаги, кроме пропущенных. */
  total: number;
  /** Всё сделано или пропущено. */
  complete: boolean;
  /**
   * Что показать в шапке:
   *  - `progress` — «N из M» с чек-листом;
   *  - `ready` — тихое «Готово»: всё закрыто, но есть пропущенные шаги, и их
   *    должно быть можно вернуть из того же меню;
   *  - `hidden` — всё сделано без пропусков: возвращать нечего, место в
   *    шапке дороже.
   */
  mode: 'progress' | 'ready' | 'hidden';
}

/** Тот же счёт «N из M», что у сервера: пропущенное выпадает из цели. */
export function summarizeOnboarding(
  steps: OnboardingStepState[],
): OnboardingSummary {
  const counted = steps.filter((step) => !step.skipped);
  const done = counted.filter((step) => step.done).length;
  const complete = done === counted.length;
  const hasSkipped = steps.some((step) => step.skipped);

  return {
    done,
    total: counted.length,
    complete,
    mode: !complete ? 'progress' : hasSkipped ? 'ready' : 'hidden',
  };
}

/**
 * Список пропусков после нажатия «Пропустить» или «Вернуть».
 *
 * Считается от ТЕКУЩИХ шагов, а не от прошлого ответа: два быстрых нажатия
 * подряд не должны затирать друг друга. Сделанный шаг в список не попадает —
 * пропуск сделанного ничего не значит.
 */
export function nextSkippedList(
  steps: OnboardingStepState[],
  key: OnboardingStepKey,
  skip: boolean,
): OnboardingStepKey[] {
  const current = steps
    .filter((step) => step.skipped && !step.done)
    .map((step) => step.key);
  const without = current.filter((item) => item !== key);
  const target = steps.find((step) => step.key === key);

  return skip && target && !target.done ? [...without, key] : without;
}

/** Шаги после пропуска/возврата — чтобы меню отозвалось сразу. */
export function applySkipped(
  steps: OnboardingStepView[],
  skipped: OnboardingStepKey[],
): OnboardingStepView[] {
  return steps.map((step) => ({
    ...step,
    skipped: !step.done && skipped.includes(step.key),
  }));
}

/**
 * Запрос отчёта? Все отчёты витрины спрашиваются под общим префиксом
 * `FINANCIAL_REPORT` — по нему и узнаём, что человек собрал отчёт.
 */
export function isFinancialReportQuery(queryKey: unknown): boolean {
  return Array.isArray(queryKey) && queryKey[0] === t.FINANCIAL_REPORT;
}
