import { describe, it, expect } from 'vitest';
import { resolveDefaultDepositAccount } from './depositAccountPrefill';

/**
 * Р4 карты v16. Поле «счёт зачисления» в форме оплаты обязательно и было
 * БЕЗ префила: новичок с единственным расчётным счётом всё равно обязан
 * выбрать его руками, а забыв — получает ошибку.
 */
const account = (id: number, type: string) => ({ id, account_type: type });

describe('resolveDefaultDepositAccount', () => {
  it('настройка предпочитаемого счёта важнее всего', () => {
    expect(
      resolveDefaultDepositAccount(
        [account(1, 'bank'), account(2, 'cash')],
        7,
      ),
    ).toBe(7);
  });

  it('единственный подходящий счёт подставляется сам', () => {
    expect(
      resolveDefaultDepositAccount(
        [account(1, 'bank'), account(9, 'fixed-asset')],
        null,
      ),
    ).toBe(1);
  });

  it('несколько подходящих — не гадаем, оставляем пустым', () => {
    expect(
      resolveDefaultDepositAccount(
        [account(1, 'bank'), account(2, 'cash')],
        null,
      ),
    ).toBe('');
  });

  it('подходящих нет — пусто', () => {
    expect(
      resolveDefaultDepositAccount([account(9, 'fixed-asset')], null),
    ).toBe('');
    expect(resolveDefaultDepositAccount([], undefined)).toBe('');
  });
});
