// © 2026 Bigfin
/**
 * Онбординг: прогресс в шапке (FT-095 ТЗ-3).
 *
 * Здесь — только правило «сделан ли шаг» по уже собранным числам. Числа
 * собирает `GetOnboardingStatusService`; разделение нужно, чтобы правило
 * проверялось спекой без базы: именно в нём живут решения вроде «счёт из
 * сида — не счёт человека».
 *
 * ОТМЕТКИ СЧИТАЮТСЯ ПО НАСТОЯЩИМ ДАННЫМ, а не по нажатию «я сделал».
 * Галочка, которую можно поставить руками, ничего не говорит о том, готов
 * ли учёт; галочка из данных — говорит.
 */

/**
 * Шаги в порядке, в котором их удобно проходить: сначала деньги (счёт →
 * выписка → статьи → правило), потом то, что экономит время дальше (банк,
 * помощник, план), и в конце — результат (отчёт).
 *
 * Ключи — одно слово латиницей НАМЕРЕННО: общий перехватчик ответов
 * переводит имена полей из верблюжьего вида в змеиный, и составной ключ
 * внутри значения было бы легко перепутать с именем поля.
 */
export const ONBOARDING_STEP_KEYS = [
  'account',
  'statement',
  'articles',
  'rule',
  'bank',
  'team',
  'payment',
  'report',
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEP_KEYS)[number];

/** Сырые сигналы из базы и личных настроек — одно число/флаг на шаг. */
export interface OnboardingSignals {
  /** Денежные счета (банк, касса, карта), заведённые человеком, а не сидом. */
  userMoneyAccounts: number;
  /** Загруженные выписки: пакеты импорта и строки «Разбора». */
  statementRows: number;
  /** Свои статьи или статьи, к которым привязан счёт учёта. */
  customizedArticles: number;
  /** Автоправила разнесения. */
  bankRules: number;
  /** Подключённые банки: по API (Т-Банк, Альфа) или через Plaid. */
  connectedBanks: number;
  /** Люди в организации, включая приглашённых. */
  teamMembers: number;
  /** Плановые операции платёжного календаря. */
  plannedOperations: number;
  /** Человек хоть раз собрал отчёт (личная отметка). */
  reportBuilt: boolean;
}

export interface OnboardingStep {
  key: OnboardingStepKey;
  done: boolean;
  skipped: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  /** Сделано шагов (пропуск сделанным не считается). */
  done: number;
  /** Сколько шагов осталось в цели: пропущенные из неё выпадают. */
  total: number;
  /** Все шаги сделаны или пропущены — счётчику больше нечего считать. */
  complete: boolean;
}

/**
 * Список пропущенных шагов из личной настройки.
 *
 * Настройка приходит из хранилища «ключ — значение» как есть: там может
 * лежать что угодно — строка, мусор, шаг, который потом убрали из
 * продукта. Незнакомое отбрасываем, а не показываем «пропущенным»: шаг,
 * которого нет в списке, человек вернуть не сможет.
 */
export function normalizeSkipped(raw: unknown): OnboardingStepKey[] {
  if (!Array.isArray(raw)) return [];

  const known = new Set<string>(ONBOARDING_STEP_KEYS);
  const result: OnboardingStepKey[] = [];

  raw.forEach((value) => {
    if (typeof value !== 'string' || !known.has(value)) return;
    if (result.includes(value as OnboardingStepKey)) return;
    result.push(value as OnboardingStepKey);
  });
  return result;
}

/** Правило «шаг сделан» для каждого ключа. */
const isDone = (key: OnboardingStepKey, s: OnboardingSignals): boolean => {
  switch (key) {
    case 'account':
      return s.userMoneyAccounts > 0;
    case 'statement':
      return s.statementRows > 0;
    case 'articles':
      return s.customizedArticles > 0;
    case 'rule':
      return s.bankRules > 0;
    case 'bank':
      return s.connectedBanks > 0;
    // Один человек в организации — это сам владелец. Шаг сделан, когда
    // появился второй: принятое приглашение или ещё ждущее ответа —
    // владелец своё действие уже совершил.
    case 'team':
      return s.teamMembers > 1;
    case 'payment':
      return s.plannedOperations > 0;
    case 'report':
      return s.reportBuilt === true;
    default:
      return false;
  }
};

/**
 * Собирает статус онбординга.
 *
 * СЧЁТЧИК «N из M». Пропущенный шаг выпадает из M: человек сказал «мне это
 * не нужно», и держать его вечно на «5 из 8» значит упрекать за чужой
 * сценарий. Шаг, сделанный ПОСЛЕ пропуска, снова считается — сделанное
 * важнее пропуска, и счётчик не должен уменьшиться от полезного действия.
 */
export function buildOnboardingStatus(
  signals: OnboardingSignals,
  skippedRaw: unknown,
): OnboardingStatus {
  const skipped = normalizeSkipped(skippedRaw);

  const steps = ONBOARDING_STEP_KEYS.map((key) => {
    const done = isDone(key, signals);
    return { key, done, skipped: !done && skipped.includes(key) };
  });

  const counted = steps.filter((step) => !step.skipped);
  const done = counted.filter((step) => step.done).length;

  return {
    steps,
    done,
    total: counted.length,
    complete: done === counted.length,
  };
}
