// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CASH_ACCOUNT_TYPES, PL_ACCOUNT_TYPES } from '../constants';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import {
  computePlCashflowComparison,
  PlCashflowComparison,
} from '../utils/computePlCashflowComparison';

/**
 * Сверка ОПиУ↔ДДС: помесячные plIncome/plExpense/plNet (P&L-счета, нетто по
 * нормали) против cashIn/cashOut/cashNet (счета cash/bank) и diff. Агрегация
 * по (счёт, месяц) — на стороне SQL, арифметика — чистая функция
 * computePlCashflowComparison (NaN-safe). Расхождение — повод проверить,
 * не ошибка сама по себе (начисления/авансы).
 */
@Injectable()
export class GetPlCashflowComparisonService {
  constructor(
    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  public async getComparison(
    query: DataQualityQueryDto,
  ): Promise<PlCashflowComparison> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', [...PL_ACCOUNT_TYPES, ...CASH_ACCOUNT_TYPES]);
    if (accounts.length === 0) {
      return computePlCashflowComparison([], []);
    }
    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        qb.select(['accountId']);
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('accountId');
        // Добавляет select DATE_FORMAT(date, '%Y-%m') as date + group by month.
        qb.modify('groupByDateFormat', 'month');
        qb.whereIn(
          'accountId',
          accounts.map((a) => a.id),
        );
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
      });

    return computePlCashflowComparison(
      rows.map((row: any) => ({
        month: row.date,
        accountId: row.accountId,
        credit: row.credit,
        debit: row.debit,
      })),
      accounts.map((a: any) => ({ id: a.id, accountType: a.accountType })),
    );
  }
}
