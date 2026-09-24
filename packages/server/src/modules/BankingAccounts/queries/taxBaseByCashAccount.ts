// © 2026 Bigfin
import { ICashBasisLeg } from '@/modules/FinancialStatements/modules/ProfitLossSheet/ProfitLossSheetCashBasis';

/**
 * Доход и расход кассовым методом — по каждому денежному счёту (FT-070 ТЗ-3).
 *
 * ОТКУДА ЦИФРЫ. Ровно те же строки, из которых кассовый ОПиУ собирает доход
 * и расход для оценки налога: документы, коснувшиеся денег (кроме переводов
 * между своими счетами), плюс доход и расход, признанные по факту оплаты
 * счетов покупателям и поставщикам. Второго правила «что считать доходом»
 * здесь нет — иначе оценка по счетам и отчёт о прибылях разошлись бы.
 *
 * ЧЕЙ ДОХОД. Каждая такая строка принадлежит документу, а документ — тому
 * денежному счёту, который он задел. Документ, задевший два денежных счёта
 * (такое бывает только у разбитой оплаты), отдаётся счёту с большим
 * оборотом: делить одну выручку между счетами пропорционально значило бы
 * выдумывать, откуда пришли деньги.
 *
 * Типы счетов учёта — те же, что у разделов ОПиУ: «Доходы» + «Прочие
 * доходы» и «Себестоимость» + «Расходы» + «Прочие расходы».
 */
export const TAX_INCOME_ACCOUNT_TYPES = ['income', 'other-income'];
export const TAX_EXPENSE_ACCOUNT_TYPES = [
  'cost-of-goods-sold',
  'expense',
  'other-expense',
];

export interface CashAccountTaxBase {
  income: number;
  expenses: number;
}

const keyOf = (leg: { referenceType: string; referenceId: number }) =>
  `${leg.referenceType}:${leg.referenceId}`;

/**
 * @param settledLegs строки документов, коснувшихся денег (уже без переводов)
 * @param recognizedLegs строки, признанные по факту оплаты (от имени платежа)
 * @param accountTypeById тип каждого счёта учёта
 * @param isCashAccount денежный ли счёт
 */
export function taxBaseByCashAccount(params: {
  settledLegs: ICashBasisLeg[];
  recognizedLegs: ICashBasisLeg[];
  accountTypeById: Map<number, string>;
  isCashAccount: (accountId: number) => boolean;
}): Map<number, CashAccountTaxBase> {
  const { settledLegs, recognizedLegs, accountTypeById, isCashAccount } = params;

  // Документ → денежный счёт с наибольшим оборотом по нему.
  const turnover = new Map<string, Map<number, number>>();
  settledLegs.forEach((leg) => {
    if (!isCashAccount(leg.accountId)) return;
    const key = keyOf(leg);
    const byAccount = turnover.get(key) ?? new Map<number, number>();
    const moved = Math.abs(Number(leg.debit || 0) - Number(leg.credit || 0));
    byAccount.set(leg.accountId, (byAccount.get(leg.accountId) ?? 0) + moved);
    turnover.set(key, byAccount);
  });

  const cashAccountOf = new Map<string, number>();
  turnover.forEach((byAccount, key) => {
    let best: number | null = null;
    let bestAmount = -1;
    byAccount.forEach((amount, accountId) => {
      if (amount > bestAmount) {
        best = accountId;
        bestAmount = amount;
      }
    });
    if (best !== null) cashAccountOf.set(key, best);
  });

  const result = new Map<number, CashAccountTaxBase>();
  const add = (accountId: number, field: keyof CashAccountTaxBase, value: number) => {
    const current = result.get(accountId) ?? { income: 0, expenses: 0 };
    current[field] += value;
    result.set(accountId, current);
  };

  [...settledLegs, ...recognizedLegs].forEach((leg) => {
    const cashAccountId = cashAccountOf.get(keyOf(leg));
    if (cashAccountId === undefined) return;

    const type = accountTypeById.get(leg.accountId) ?? '';
    const credit = Number(leg.credit || 0);
    const debit = Number(leg.debit || 0);

    // Доход растёт кредитом, расход — дебетом: ровно как нормальная
    // сторона этих счетов в ОПиУ.
    if (TAX_INCOME_ACCOUNT_TYPES.includes(type)) {
      add(cashAccountId, 'income', credit - debit);
    } else if (TAX_EXPENSE_ACCOUNT_TYPES.includes(type)) {
      add(cashAccountId, 'expenses', debit - credit);
    }
  });

  result.forEach((base) => {
    base.income = Math.round(base.income * 100) / 100;
    base.expenses = Math.round(base.expenses * 100) / 100;
  });
  return result;
}
