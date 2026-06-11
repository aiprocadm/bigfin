// © 2026 Bigfin
import {
  CASH_ACCOUNT_TYPES,
  PL_EXPENSE_ACCOUNT_TYPES,
  PL_INCOME_ACCOUNT_TYPES,
} from '../constants';
import { round2, toNumber } from './dataQualityMath';

export interface MonthlyAccountTotalRow {
  /** Месяц 'YYYY-MM' (агрегат SQL по DATE_FORMAT). */
  month: string;
  accountId: number;
  credit: number;
  debit: number;
}

export interface ComparisonAccountMeta {
  id: number;
  accountType: string;
}

export interface PlCashflowMonth {
  month: string;
  plIncome: number;
  plExpense: number;
  plNet: number;
  cashIn: number;
  cashOut: number;
  cashNet: number;
  diff: number;
}

export interface PlCashflowComparison {
  months: PlCashflowMonth[];
  totals: { plNet: number; cashNet: number; diff: number };
}

/**
 * Помесячная сверка ОПиУ↔ДДС (NaN-safe, паттерн payrollMath):
 *
 *   plIncome  = Σ нетто (credit − debit) по счетам income/other-income
 *               (credit-normal по конфигу типов счетов);
 *   plExpense = Σ нетто (debit − credit) по счетам expense/COGS/other-expense
 *               (debit-normal);
 *   plNet     = plIncome − plExpense;
 *   cashIn    = Σ debit  по счетам cash/bank;
 *   cashOut   = Σ credit по счетам cash/bank;
 *   cashNet   = cashIn − cashOut;
 *   diff      = plNet − cashNet.
 *
 * Знак нетто детерминирован типом счёта (нормаль однозначно следует из типа
 * в ACCOUNT_TYPES-конфиге), переводы между своими денежными счетами в cashNet
 * взаимно гасятся. Счета прочих типов игнорируются. Месяцы — только те, где
 * были проводки, по возрастанию.
 */
export function computePlCashflowComparison(
  rows: MonthlyAccountTotalRow[],
  accounts: ComparisonAccountMeta[],
): PlCashflowComparison {
  const typeById = new Map<number, string>();
  accounts.forEach((a) => typeById.set(a.id, a.accountType));

  interface Bucket {
    plIncome: number;
    plExpense: number;
    cashIn: number;
    cashOut: number;
  }
  const byMonth = new Map<string, Bucket>();
  const bucketOf = (month: string): Bucket => {
    let bucket = byMonth.get(month);
    if (!bucket) {
      bucket = { plIncome: 0, plExpense: 0, cashIn: 0, cashOut: 0 };
      byMonth.set(month, bucket);
    }
    return bucket;
  };

  rows.forEach((row) => {
    const accountType = typeById.get(row.accountId);
    if (!accountType || !row.month) return;

    const credit = toNumber(row.credit);
    const debit = toNumber(row.debit);
    const bucket = bucketOf(row.month);

    if (PL_INCOME_ACCOUNT_TYPES.includes(accountType)) {
      bucket.plIncome += credit - debit;
    } else if (PL_EXPENSE_ACCOUNT_TYPES.includes(accountType)) {
      bucket.plExpense += debit - credit;
    } else if (CASH_ACCOUNT_TYPES.includes(accountType)) {
      bucket.cashIn += debit;
      bucket.cashOut += credit;
    }
  });

  const months: PlCashflowMonth[] = [...byMonth.keys()].sort().map((month) => {
    const bucket = byMonth.get(month)!;
    const plIncome = round2(bucket.plIncome);
    const plExpense = round2(bucket.plExpense);
    const plNet = round2(plIncome - plExpense);
    const cashIn = round2(bucket.cashIn);
    const cashOut = round2(bucket.cashOut);
    const cashNet = round2(cashIn - cashOut);
    return {
      month,
      plIncome,
      plExpense,
      plNet,
      cashIn,
      cashOut,
      cashNet,
      diff: round2(plNet - cashNet),
    };
  });

  const totalPlNet = round2(months.reduce((sum, m) => sum + m.plNet, 0));
  const totalCashNet = round2(months.reduce((sum, m) => sum + m.cashNet, 0));
  return {
    months,
    totals: {
      plNet: totalPlNet,
      cashNet: totalCashNet,
      diff: round2(totalPlNet - totalCashNet),
    },
  };
}
