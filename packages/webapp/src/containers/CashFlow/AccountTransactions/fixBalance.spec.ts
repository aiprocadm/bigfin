// © 2026 Bigfin
import { vi } from 'vitest';

// Ключ и подстановки видны в тексте целиком: проверяем, КАКОЕ сообщение
// выбрано и с какими числами, не завися от словаря.
vi.mock('react-intl-universal', () => ({
  default: {
    get: (key: string, vars?: Record<string, string>) =>
      vars ? `${key} ${JSON.stringify(vars)}` : key,
  },
}));

import { fixBalanceResultMessage } from './fixBalance';

/**
 * FT-071 ТЗ-3: сообщение после фиксации остатка.
 */
describe('сообщение после фиксации остатка', () => {
  it('разницы нет — прямо говорим, что остаток уже совпадает', () => {
    const message = fixBalanceResultMessage(
      { created: false, difference: 0, target_balance: 1000 },
      '2026-09-23',
      'RUB',
    );

    expect(message.created).toBe(false);
    expect(message.text).toContain('fix_balance.result.no_difference');
    expect(message.text).toContain('23.09.2026');
  });

  it('в банке больше — сообщение о приходе на разницу', () => {
    const message = fixBalanceResultMessage(
      { created: true, difference: 700, target_balance: 125000 },
      '2026-09-23',
      'RUB',
    );

    expect(message.created).toBe(true);
    expect(message.text).toContain('fix_balance.result.added');
    expect(message.text).toMatch(/700/);
  });

  it('в банке меньше — сообщение о списании, сумма без минуса', () => {
    const message = fixBalanceResultMessage(
      { created: true, difference: -250.5, target_balance: 100 },
      '2026-09-23',
      'RUB',
    );

    expect(message.text).toContain('fix_balance.result.subtracted');
    expect(message.text).not.toMatch(/-250/);
    expect(message.text).toMatch(/250,50/);
  });
});
