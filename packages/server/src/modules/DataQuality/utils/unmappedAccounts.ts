// © 2026 Bigfin
import { MAX_OPERATIONS_PER_ACCOUNT, PL_ACCOUNT_TYPES } from '../constants';
import { round2, toDateKey, toNumber } from './dataQualityMath';

export interface PlAccountRow {
  id: number;
  name: string;
  code?: string | null;
  accountType: string;
  /** 'credit' | 'debit' — нормаль счёта (virtual attribute модели Account). */
  accountNormal?: string;
}

export interface UnmappedTransactionRow {
  id: number;
  accountId: number;
  date: Date | string;
  credit: number;
  debit: number;
  referenceType: string;
  referenceId: number;
  transactionNumber?: string | null;
  referenceNumber?: string | null;
}

export interface UnmappedOperation {
  transactionId: number;
  date: string;
  amount: number;
  side: 'in' | 'out';
  referenceType: string;
  referenceId: number;
  transactionNumber: string | null;
  referenceNumber: string | null;
}

export interface UnmappedAccountReport {
  accountId: number;
  accountName: string;
  accountCode: string | null;
  operationsCount: number;
  totalAmount: number;
  operations: UnmappedOperation[];
}

export interface UnmappedOperationsResult {
  accounts: UnmappedAccountReport[];
  totalCount: number;
}

/**
 * Оставляет счета P&L-типов (income/expense/COGS/other-*), НЕ привязанные
 * к управленческой статье. Счета «денег» и балансовые статьи не требуют —
 * они сюда не попадают по типу.
 */
export function filterUnmappedPlAccounts(
  accounts: PlAccountRow[],
  mappedAccountIds: number[],
): PlAccountRow[] {
  const mapped = new Set(mappedAccountIds);
  return accounts.filter(
    (a) => PL_ACCOUNT_TYPES.includes(a.accountType) && !mapped.has(a.id),
  );
}

/**
 * Собирает отчёт «операции без статьи» по непривязанным P&L-счетам:
 * - счёт без проводок за период не показывается (нет операций — нет проблемы);
 * - totalAmount — нетто по нормали счёта (credit-normal → credit − debit,
 *   debit-normal → debit − credit), NaN-safe;
 * - operations — последние ≤ maxOperations проводок (дата убыв., затем id
 *   убыв. для стабильности); amount операции — её ненулевая нога;
 * - side: 'in', если ненулевая нога совпадает с нормалью счёта (debit > 0 на
 *   debit-normal либо credit > 0 на credit-normal), т.е. операция УВЕЛИЧИВАЕТ
 *   показатель счёта; иначе 'out' (сторно/возврат). Детерминированно;
 * - счета сортируются по |totalAmount| убыв. — крупные пропуски сверху;
 * - totalCount — суммарное число операций без статьи по всем счетам
 *   (operations на счёт обрезаны лимитом, totalCount показывает масштаб).
 */
export function buildUnmappedAccountsReport(
  accounts: PlAccountRow[],
  transactions: UnmappedTransactionRow[],
  maxOperations: number = MAX_OPERATIONS_PER_ACCOUNT,
): UnmappedOperationsResult {
  const rowsByAccountId = new Map<number, UnmappedTransactionRow[]>();
  transactions.forEach((row) => {
    const rows = rowsByAccountId.get(row.accountId);
    if (rows) {
      rows.push(row);
    } else {
      rowsByAccountId.set(row.accountId, [row]);
    }
  });

  const reports: UnmappedAccountReport[] = [];
  accounts.forEach((account) => {
    const rows = rowsByAccountId.get(account.id) || [];
    if (rows.length === 0) return; // нет операций за период — не проблема

    const creditNormal = account.accountNormal === 'credit';
    const totalAmount = round2(
      rows.reduce((sum, row) => {
        const credit = toNumber(row.credit);
        const debit = toNumber(row.debit);
        return sum + (creditNormal ? credit - debit : debit - credit);
      }, 0),
    );

    const operations = rows
      .slice()
      .sort(
        (a, b) =>
          toDateKey(b.date).localeCompare(toDateKey(a.date)) || b.id - a.id,
      )
      .slice(0, maxOperations)
      .map((row): UnmappedOperation => {
        const credit = toNumber(row.credit);
        const debit = toNumber(row.debit);
        const amount = round2(credit !== 0 ? credit : debit);
        const increases = creditNormal ? credit !== 0 : debit !== 0;
        return {
          transactionId: row.id,
          date: toDateKey(row.date),
          amount,
          side: increases ? 'in' : 'out',
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          transactionNumber: row.transactionNumber ?? null,
          referenceNumber: row.referenceNumber ?? null,
        };
      });

    reports.push({
      accountId: account.id,
      accountName: account.name,
      accountCode: account.code ?? null,
      operationsCount: rows.length,
      totalAmount,
      operations,
    });
  });

  reports.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));
  return {
    accounts: reports,
    totalCount: reports.reduce((sum, r) => sum + r.operationsCount, 0),
  };
}
