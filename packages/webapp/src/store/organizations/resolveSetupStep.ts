/**
 * Шаги мастера первичной настройки.
 *
 * Шага «Подписка» здесь намеренно нет. Раньше он стоял первым и выбирался
 * условием «подписка неактивна» — а у нового пользователя подписки нет
 * никогда, поэтому оплата чужого сервиса с долларовыми тарифами и английским
 * текстом была ПЕРВЫМ экраном для всех (М4 карты v15).
 */
export interface SetupConditions {
  isOrganizationReady?: boolean;
  isOrganizationBuildRunning?: boolean;
  isOrganizationSetupCompleted?: boolean;
  /** Оставлено для совместимости с вызывающим кодом; на шаги не влияет. */
  isSubscriptionActive?: boolean;
}

export interface SetupStep {
  step: string;
  matches: (conditions: SetupConditions) => boolean;
}

export const SETUP_STEPS: SetupStep[] = [
  {
    step: 'organization',
    matches: (c) => !c.isOrganizationReady && !c.isOrganizationBuildRunning,
  },
  {
    step: 'initializing',
    matches: (c) => Boolean(c.isOrganizationBuildRunning),
  },
  {
    step: 'congrats',
    matches: (c) => Boolean(c.isOrganizationSetupCompleted),
  },
];

/**
 * Какой шаг мастера показывать.
 * @param {SetupConditions} conditions - Состояние организации.
 */
export function resolveSetupStep(conditions: SetupConditions): {
  setupStepId: string | undefined;
  setupStepIndex: number;
} {
  const found = SETUP_STEPS.find((step) => step.matches(conditions));

  return {
    setupStepId: found?.step,
    setupStepIndex: found ? SETUP_STEPS.indexOf(found) : -1,
  };
}
