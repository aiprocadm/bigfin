import { describe, it, expect } from 'vitest';

import { isAiCfoNoAccessResponse } from './aiCfoNoAccessResponse';

/**
 * Отказ AI CFO по одному вопросу не должен закрывать экран целиком: иначе
 * сотрудник без права на один отчёт терял бы и все остальные вопросы.
 */
describe('отказ AI CFO «нет доступа к отчёту»', () => {
  it('узнаёт свою метку', () => {
    expect(
      isAiCfoNoAccessResponse({
        errors: [{ type: 'AI_CFO_NO_ACCESS', message: 'нет доступа' }],
      }),
    ).toBe(true);
  });

  it('не путает с другими отказами 403', () => {
    // Обычный отказ в правах обязан по-прежнему закрывать экран.
    expect(isAiCfoNoAccessResponse({ errors: [{ type: 'FEATURE_DISABLED' }] })).toBe(false);
    expect(isAiCfoNoAccessResponse({ message: 'Forbidden' })).toBe(false);
  });

  it('не падает на пустом и странном теле', () => {
    expect(isAiCfoNoAccessResponse(undefined)).toBe(false);
    expect(isAiCfoNoAccessResponse({ errors: 'oops' })).toBe(false);
  });
});
