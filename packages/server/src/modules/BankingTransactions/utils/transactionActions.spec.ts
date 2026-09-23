// © 2026 Bigfin
import { pascalType, transferPlan, TRANSACTION_ACTION_ERRORS } from './transactionActions';

/**
 * «Преобразовать в перевод» (FT-022 ТЗ-3): что можно, что нельзя и почему.
 */
describe('превращение операции в перевод', () => {
  const bank = { id: 1000, accountType: 'bank', currencyCode: 'RUB' };
  const cash = { id: 1001, accountType: 'cash', currencyCode: 'RUB' };
  const usd = { id: 1002, accountType: 'bank', currencyCode: 'USD' };
  const expense = { id: 1021, accountType: 'expense', currencyCode: 'RUB' };
  const op = (transactionType: string) => ({
    transactionType,
    cashflowAccountId: 1000,
    cashflowAccount: bank,
  });

  it('выплата — «перевод на счёт», поступление — «перевод со счёта»', () => {
    expect(transferPlan(op('OtherExpense'), cash, false)).toEqual({ transactionType: 'TransferToAccount' });
    expect(transferPlan(op('OtherIncome'), cash, false)).toEqual({ transactionType: 'TransferFromAccount' });
    // В базе встречается и змеиное написание вида.
    expect(transferPlan(op('owner_drawing'), cash, false)).toEqual({ transactionType: 'TransferToAccount' });
  });

  it.each([
    ['уже перевод', op('TransferToAccount'), cash, false, TRANSACTION_ACTION_ERRORS.ALREADY_TRANSFER],
    ['счёт статьи вместо денег', op('OtherExpense'), expense, false, TRANSACTION_ACTION_ERRORS.TRANSFER_TARGET_INVALID],
    ['счёта нет', op('OtherExpense'), null, false, TRANSACTION_ACTION_ERRORS.TRANSFER_TARGET_INVALID],
    ['тот же счёт', op('OtherExpense'), bank, false, TRANSACTION_ACTION_ERRORS.TRANSFER_SAME_ACCOUNT],
    ['разные валюты', op('OtherExpense'), usd, false, TRANSACTION_ACTION_ERRORS.TRANSFER_CURRENCY_MISMATCH],
    ['есть части', op('OtherExpense'), cash, true, TRANSACTION_ACTION_ERRORS.TRANSFER_HAS_SPLITS],
    ['неизвестный вид', op('Payment'), cash, false, TRANSACTION_ACTION_ERRORS.TRANSFER_NOT_SUPPORTED],
  ])('отказ с объяснением: %s', (_label, operation, target, hasSplits, error) => {
    const plan: any = transferPlan(operation, target, hasSplits as boolean);
    expect(plan.error).toBe(error);
    // AC FT-022: человек видит, ПОЧЕМУ нельзя, а не «ошибка».
    expect(plan.message.length).toBeGreaterThan(10);
  });

  it('текст про валюту — ровно из ТЗ', () => {
    expect((transferPlan(op('OtherExpense'), usd, false) as any).message).toBe(
      'Перевод возможен только между счетами одной валюты',
    );
  });

  it('одно написание вида', () => {
    expect(pascalType('other_expense')).toBe('OtherExpense');
    expect(pascalType('OtherExpense')).toBe('OtherExpense');
    expect(pascalType(null)).toBe('');
  });
});
