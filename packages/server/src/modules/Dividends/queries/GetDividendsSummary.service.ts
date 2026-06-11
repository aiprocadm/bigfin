// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Bill } from '@/modules/Bills/models/Bill';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { DividendPayout } from '../models/DividendPayout.model';
import { PL_ACCOUNT_TYPES } from '../constants';
import {
  computeDividendsSummary,
  computeNetProfit,
  DividendsSummary,
  sumPayouts,
  sumUnpaidBills,
} from '../utils/dividendsMath';

/**
 * Сводка «доступно/безопасно к выводу»: накопленная чистая прибыль по
 * леджеру за всё время (SQL-агрегация по P&L-счетам — паттерн ㉗) минус уже
 * выведенное; «безопасно» — дополнительно минус непогашенная кредиторка
 * (modifiers Bills из Debts ⑥). Арифметика — чистые функции dividendsMath.
 */
@Injectable()
export class GetDividendsSummaryService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(DividendPayout.name)
    private readonly payoutModel: TenantModelProxy<typeof DividendPayout>,

    @Inject(Bill.name)
    private readonly billModel: TenantModelProxy<typeof Bill>,
  ) {}

  public async getSummary(): Promise<DividendsSummary> {
    const netProfit = await this.getNetProfit();
    const totalPaidOut = await this.getTotalPaidOut();
    const unpaidBills = await this.getUnpaidBills();

    return computeDividendsSummary({ netProfit, totalPaidOut, unpaidBills });
  }

  /** Накопленная чистая прибыль за всё время по P&L-счетам. */
  private async getNetProfit(): Promise<number> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', PL_ACCOUNT_TYPES);

    if (accounts.length === 0) return 0;

    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        qb.select(['accountId']);
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('accountId');
        qb.whereIn(
          'accountId',
          accounts.map((a) => a.id),
        );
      });

    return computeNetProfit(
      rows as any[],
      accounts.map((a: any) => ({ id: a.id, accountType: a.accountType })),
    );
  }

  /** Сумма всех зарегистрированных выплат собственнику. */
  private async getTotalPaidOut(): Promise<number> {
    const payouts = await this.payoutModel().query();
    return sumPayouts(payouts as any[]);
  }

  /** Непогашенная кредиторка: текущие + просроченные Bills (паттерн Debts). */
  private async getUnpaidBills(): Promise<number> {
    const asDate = moment().format('YYYY-MM-DD');

    const overdue = await this.billModel()
      .query()
      .modify('overdueBillsFromDate', asDate);
    const current = await this.billModel()
      .query()
      .modify('dueBillsFromDate', asDate);

    return sumUnpaidBills([...(overdue as any[]), ...(current as any[])]);
  }
}
