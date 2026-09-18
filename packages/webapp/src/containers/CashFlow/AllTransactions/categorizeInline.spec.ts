import { describe, it, expect } from 'vitest';

import {
  buildCategorizePayload,
  inlineAccountRootType,
  inlineTransactionType,
  isDepositRow,
  pickAccountsForRow,
  suggestedAccount,
} from './categorizeInline';

/**
 * Этап 3 ТЗ, шаг 3.5. Разнос одним движением.
 *
 * Приёмка требует разнести десять операций подряд, ни разу не открыв
 * модальное окно. Значит строка обязана сама собрать верный запрос: подставить
 * тип операции, предложить подходящие статьи и не потерять назначение платежа.
 *
 * Самая опасная ошибка здесь — перепутать сторону: предложить расходные статьи
 * для поступления. Деньги ушли бы не в тот раздел отчётов, и человек этого не
 * заметил бы.
 */
const deposit = {
  id: 10,
  date: '2026-03-05',
  deposit: 15000,
  withdrawal: 0,
  description: 'Оплата по счёту 41',
};

const withdrawal = {
  id: 11,
  date: '2026-03-06',
  deposit: 0,
  withdrawal: 8000,
  description: 'Аренда офиса',
  contact_id: 7,
};

describe('разнос операции из строки', () => {
  it('различает приход и расход по заполненной стороне', () => {
    expect(isDepositRow(deposit)).toBe(true);
    expect(isDepositRow(withdrawal)).toBe(false);
  });

  it('приходу подставляет доход, расходу — расход', () => {
    expect(inlineTransactionType(deposit)).toBe('other_income');
    expect(inlineTransactionType(withdrawal)).toBe('other_expense');

    expect(inlineAccountRootType(deposit)).toBe('income');
    expect(inlineAccountRootType(withdrawal)).toBe('expense');
  });

  it('предлагает только статьи своей стороны', () => {
    const accounts = [
      { id: 1, name: 'Выручка', account_root_type: 'income' },
      { id: 2, name: 'Аренда', account_root_type: 'expense' },
      { id: 3, name: 'Расчётный счёт', account_root_type: 'asset' },
    ];

    expect(pickAccountsForRow(deposit, accounts).map((a) => a.id)).toEqual([1]);
    expect(pickAccountsForRow(withdrawal, accounts).map((a) => a.id)).toEqual([
      2,
    ]);
  });

  it('понимает счета и в верблюжьем написании', () => {
    // Часть мест витрины отдаёт счета без перевода в змеиное написание;
    // список статей от этого молча пустел бы.
    const accounts = [{ id: 5, name: 'Реклама', accountRootType: 'expense' }];

    expect(pickAccountsForRow(withdrawal, accounts).map((a) => a.id)).toEqual([
      5,
    ]);
  });

  it('читает подсказку от правила разноски', () => {
    expect(
      suggestedAccount({ assigned_account_id: 4, assigned_account_name: 'Аренда' }),
    ).toEqual({ id: 4, name: 'Аренда' });
    // Правило не сработало — подсказки нет, кнопку показывать нечем.
    expect(suggestedAccount({ assigned_account_id: null })).toBeNull();
  });

  it('собирает тело запроса и сохраняет назначение платежа', () => {
    expect(buildCategorizePayload(withdrawal, 2)).toEqual({
      uncategorized_transaction_ids: [11],
      date: '2026-03-06',
      credit_account_id: 2,
      transaction_type: 'other_expense',
      exchange_rate: 1,
      description: 'Аренда офиса',
      contact_id: 7,
    });
  });

  it('пустых полей в запрос не кладёт', () => {
    const payload = buildCategorizePayload(
      { id: 12, date: '2026-03-07', deposit: 100 },
      9,
    );

    expect(payload).toEqual({
      uncategorized_transaction_ids: [12],
      date: '2026-03-07',
      credit_account_id: 9,
      transaction_type: 'other_income',
      exchange_rate: 1,
    });
  });
});
