import { describe, it, expect } from 'vitest';
import { getMoneyInSchema } from './MoneyIn.zod';
import { getMoneyOutSchema } from '../../MoneyOutDialog/v2/MoneyOut.zod';

/**
 * К3 карты v19. Обязательность «счёт выбран» проверялась через `refine`,
 * который в новых версиях сужает выводимый тип до `number` — и значение по
 * умолчанию `null` переставало подходить под тип формы (28 ошибок под
 * компилятором 5.6). Заменено на `superRefine`, тип остаётся `number | null`.
 *
 * Тесты закрепляют то, что при этом меняться НЕ должно: незаполненный счёт
 * по-прежнему ошибка, заполненный — проходит.
 */
const valid = {
  date: '2026-08-24',
  amount: '1000',
  transaction_type: 'other_income',
  cashflow_account_id: 1,
  credit_account_id: 2,
  transaction_number: 'TR-1',
  reference_no: '',
  branch_id: null,
  exchange_rate: '1',
  description: '',
};

describe.each([
  ['поступление денег', getMoneyInSchema],
  ['списание денег', getMoneyOutSchema],
])('%s: проверка формы', (_name, getSchema) => {
  it('заполненная форма проходит', () => {
    expect(getSchema().safeParse(valid).success).toBe(true);
  });

  it('без денежного счёта — ошибка', () => {
    const result = getSchema().safeParse({
      ...valid,
      cashflow_account_id: null,
    });

    expect(result.success).toBe(false);
  });

  it('без счёта-корреспондента — ошибка', () => {
    const result = getSchema().safeParse({
      ...valid,
      credit_account_id: null,
    });

    expect(result.success).toBe(false);
  });

  it('подразделение можно не указывать', () => {
    // branch_id намеренно допускает null: организация без подразделений.
    expect(getSchema().safeParse({ ...valid, branch_id: null }).success).toBe(
      true,
    );
  });

  it('сумма обязана быть числом', () => {
    expect(
      getSchema().safeParse({ ...valid, amount: 'не число' }).success,
    ).toBe(false);
  });
});
