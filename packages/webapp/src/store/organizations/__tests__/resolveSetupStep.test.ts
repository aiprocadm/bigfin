import { describe, it, expect } from 'vitest';
import {
  SETUP_STEPS,
  resolveSetupStep,
} from '../resolveSetupStep';

/**
 * М4 (карта v15): мастер первичной настройки открывался шагом «Подписка» —
 * у нового пользователя подписки нет никогда, поэтому это был ПЕРВЫЙ экран
 * для всех. На нём показывались долларовые тарифы и оплата чужого сервиса,
 * которых в продукте нет.
 *
 * Мастер должен начинаться с того, что действительно работает.
 */
describe('шаги первичной настройки', () => {
  it('новая организация начинает с ввода организации', () => {
    const step = resolveSetupStep({
      isSubscriptionActive: false,
      isOrganizationReady: false,
      isOrganizationBuildRunning: false,
      isOrganizationSetupCompleted: false,
    });

    expect(step.setupStepId).toBe('organization');
    expect(step.setupStepIndex).toBe(0);
  });

  it('идёт построение организации — шаг «подготовка»', () => {
    const step = resolveSetupStep({
      isSubscriptionActive: false,
      isOrganizationReady: false,
      isOrganizationBuildRunning: true,
      isOrganizationSetupCompleted: false,
    });

    expect(step.setupStepId).toBe('initializing');
  });

  it('настройка завершена — поздравление', () => {
    const step = resolveSetupStep({
      isSubscriptionActive: false,
      isOrganizationReady: true,
      isOrganizationBuildRunning: false,
      isOrganizationSetupCompleted: true,
    });

    expect(step.setupStepId).toBe('congrats');
  });

  it('шага «подписка» в мастере нет ни при каких условиях', () => {
    expect(SETUP_STEPS.map((s) => s.step)).not.toContain('subscription');

    const step = resolveSetupStep({
      isSubscriptionActive: false,
      isOrganizationReady: false,
      isOrganizationBuildRunning: false,
      isOrganizationSetupCompleted: false,
    });

    expect(step.setupStepId).not.toBe('subscription');
  });

  it('шагов ровно столько, сколько экранов', () => {
    expect(SETUP_STEPS).toHaveLength(3);
  });
});
