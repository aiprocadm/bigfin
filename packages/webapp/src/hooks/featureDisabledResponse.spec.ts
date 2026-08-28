// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import { isFeatureDisabledResponse } from './featureDisabledResponse';

describe('403 из-за выключенного модуля отличается от отказа в правах', () => {
  const disabled = {
    errors: [
      {
        statusCode: 403,
        type: 'FEATURE_DISABLED',
        message: 'Модуль «payroll» выключен',
        payload: { feature: 'payroll' },
      },
    ],
  };

  it('узнаёт ответ про выключенный модуль', () => {
    expect(isFeatureDisabledResponse(disabled)).toBe(true);
  });

  it('обычный отказ в правах остаётся отказом в правах', () => {
    expect(
      isFeatureDisabledResponse({ message: 'Forbidden resource' }),
    ).toBe(false);
  });

  it('чужой деловой отказ не путается с выключенным модулем', () => {
    expect(
      isFeatureDisabledResponse({ errors: [{ type: 'TRANSACTIONS_LOCKED' }] }),
    ).toBe(false);
  });

  it('пустой ответ не роняет разбор', () => {
    expect(isFeatureDisabledResponse(undefined)).toBe(false);
    expect(isFeatureDisabledResponse({ errors: null })).toBe(false);
  });
});
