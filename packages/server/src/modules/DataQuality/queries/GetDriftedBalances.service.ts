// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import { CASH_ACCOUNT_TYPES } from '../constants';
import {
  DriftedBalancesResult,
  findDriftedBalances,
} from '../utils/findDriftedBalances';

/**
 * «Остаток счёта разошёлся с проводками».
 *
 * Продукт хранит остаток денежного счёта дважды: в колонке счёта (её
 * показывают шапка и главная — это быстро) и в проводках (по ним строятся
 * отчёты — это правда). Пока они совпадают, о двойственности никто не
 * думает. Когда расходятся — человек видит одну сумму в шапке и другую в
 * отчёте, и ни один экран не объясняет, какая настоящая.
 *
 * ТОЛЬКО ДЕНЕЖНЫЕ СЧЕТА. У прочих колонка остатка не поддерживается вовсе,
 * и сравнивать там нечего с чем.
 */
@Injectable()
export class GetDriftedBalancesService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Счета, у которых колонка остатка разошлась с проводками.
   *
   * @returns {Promise<DriftedBalancesResult>}
   */
  public async getDriftedBalances(): Promise<DriftedBalancesResult> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', CASH_ACCOUNT_TYPES);

    if (!accounts.length) return { rows: [], totalDifference: 0 };

    const totals = await this.transactionModel()
      .query()
      .onBuild((qb) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('accountId');
        qb.select(['accountId']);
        qb.whereIn(
          'accountId',
          accounts.map((account: any) => account.id),
        );
      });

    const ledgerByAccount = new Map<number, number>();

    totals.forEach((row: any) => {
      // Денежный счёт — дебетовый: приход в дебет, расход в кредит.
      ledgerByAccount.set(
        Number(row.accountId),
        Number(row.debit ?? 0) - Number(row.credit ?? 0),
      );
    });

    return findDriftedBalances(
      accounts.map((account: any) => ({
        id: account.id,
        name: account.name,
        accountType: account.accountType,
        storedAmount: account.amount == null ? null : Number(account.amount),
        ledgerAmount: ledgerByAccount.get(Number(account.id)) ?? 0,
      })),
    );
  }
}
