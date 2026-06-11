import * as moment from 'moment';
import { cashSettledReferenceKeys } from '@/modules/Budgets/utils/cashSettledReferenceKeys';

/**
 * Minimal ledger leg shape required by the cash basis (P&L cash mode)
 * aggregation. Matches the `accounts_transactions` row fields.
 */
export interface ICashBasisLeg {
  referenceType: string;
  referenceId: number;
  accountId: number;
  transactionType?: string | null;
  credit?: number | null;
  debit?: number | null;
  date: Date | string;
}

export interface ICashBasisTotalRow {
  accountId: number;
  credit: number;
  debit: number;
}

export interface ICashBasisPeriodRow extends ICashBasisTotalRow {
  date: string;
}

/**
 * Date group formats aligned with the SQL `groupByDateFormat` modifier of
 * the `AccountTransaction` model (DATE_FORMAT '%Y-%m-%d' / '%Y-%m' / '%Y').
 */
const GROUP_DATE_FORMATS: Record<string, string> = {
  day: 'YYYY-MM-DD',
  month: 'YYYY-MM',
  year: 'YYYY',
};

/**
 * Keeps only the ledger legs that belong to cash-settled references:
 * the reference touched a cash/bank account and is not an internal transfer.
 * Reuses the Budgets (БДДС) prior art `cashSettledReferenceKeys`.
 * @param {T[]} legs - All ledger legs of the period.
 * @param {(accountId: number) => boolean} isCashAccount
 * @returns {T[]}
 */
export function filterCashSettledLegs<T extends ICashBasisLeg>(
  legs: T[],
  isCashAccount: (accountId: number) => boolean,
): T[] {
  const settledKeys = cashSettledReferenceKeys(legs, isCashAccount);

  return legs.filter((leg) =>
    settledKeys.has(`${leg.referenceType}:${leg.referenceId}`),
  );
}

/**
 * Aggregates the given legs by account — same shape as the accrual SQL
 * aggregation (sum credit/debit group by accountId).
 * @param {ICashBasisLeg[]} legs
 * @returns {ICashBasisTotalRow[]}
 */
export function totalCashLegsByAccount(
  legs: ICashBasisLeg[],
): ICashBasisTotalRow[] {
  const totals = new Map<number, ICashBasisTotalRow>();

  legs.forEach((leg) => {
    const row = totals.get(leg.accountId) || {
      accountId: leg.accountId,
      credit: 0,
      debit: 0,
    };
    row.credit += Number(leg.credit || 0);
    row.debit += Number(leg.debit || 0);

    totals.set(leg.accountId, row);
  });
  return Array.from(totals.values());
}

/**
 * Aggregates the given legs by account and date period — same shape as the
 * accrual SQL aggregation with the `groupByDateFormat` modifier.
 * @param {ICashBasisLeg[]} legs
 * @param {string} groupType - day | month | year (default month).
 * @returns {ICashBasisPeriodRow[]}
 */
export function periodsCashLegsByAccount(
  legs: ICashBasisLeg[],
  groupType: string = 'month',
): ICashBasisPeriodRow[] {
  const dateFormat = GROUP_DATE_FORMATS[groupType] || GROUP_DATE_FORMATS.month;
  const totals = new Map<string, ICashBasisPeriodRow>();

  legs.forEach((leg) => {
    const date = moment(leg.date).format(dateFormat);
    const key = `${leg.accountId}:${date}`;

    const row = totals.get(key) || {
      accountId: leg.accountId,
      credit: 0,
      debit: 0,
      date,
    };
    row.credit += Number(leg.credit || 0);
    row.debit += Number(leg.debit || 0);

    totals.set(key, row);
  });
  return Array.from(totals.values());
}
