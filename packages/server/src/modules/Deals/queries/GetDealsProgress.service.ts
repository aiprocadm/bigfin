// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { ACCOUNT_ROOT_TYPE, ACCOUNT_TYPE } from '@/constants/accounts';
import { AccountTypesUtils } from '@/libs/accounts-utils/AccountTypesUtils';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import { DealProgress, computeDealProgress } from '../utils/dealProgress';

/**
 * «Оплачено, %» и «Отгружено, %» для списка сделок (FIN-024 ТЗ-2).
 *
 * ПОЧЕМУ ДВА ЗАПРОСА НА ВЕСЬ СПИСОК, А НЕ ПО ЗАПРОСУ НА СДЕЛКУ. Колонки
 * стоят в таблице: посчитать их по одной значило бы сделать столько
 * запросов, сколько строк на странице. Здесь обороты собираются разом и
 * раскладываются по сделкам в памяти.
 *
 * ОТКУДА БЕРУТСЯ ДОЛИ:
 * — «Отгружено» — признанная выручка по сделке (обороты доходных счетов).
 *   Это и есть подписанные акты и отгрузки: выручка признаётся именно ими.
 * — «Оплачено» — деньги, реально пришедшие по сделке (приход на расчётные
 *   счета и в кассу).
 *
 * Знаменатель — сумма сделки по договору (`costEstimate`). Её отсутствие даёт
 * «н/о», а не ноль: ноль означал бы «ничего не оплачено», хотя оплачивать
 * нечего.
 */
@Injectable()
export class GetDealsProgressService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Прогресс по каждой сделке списка.
   *
   * @param {Array<{ id: number; costEstimate?: number | null }>} deals сделки
   * @returns {Promise<Map<number, DealProgress>>}
   */
  public async getProgress(
    deals: Array<{ id: number; costEstimate?: number | null }>,
  ): Promise<Map<number, DealProgress>> {
    const dealIds = deals.map((deal) => Number(deal.id)).filter(Boolean);
    const progress = new Map<number, DealProgress>();

    if (!dealIds.length) return progress;

    const { incomeIds, cashIds } = await this.splitAccounts();

    const [shippedRows, paidRows] = await Promise.all([
      this.sumByDeal(incomeIds, dealIds),
      this.sumByDeal(cashIds, dealIds),
    ]);

    // Выручка — кредит минус дебет: возврат покупателю уменьшает отгрузку.
    const shipped = this.netByDeal(shippedRows, (row) =>
      Number(row.credit ?? 0) - Number(row.debit ?? 0),
    );
    // Приход денег — дебет минус кредит: возврат денег уменьшает оплату.
    const paid = this.netByDeal(paidRows, (row) =>
      Number(row.debit ?? 0) - Number(row.credit ?? 0),
    );

    deals.forEach((deal) => {
      const id = Number(deal.id);

      progress.set(
        id,
        computeDealProgress({
          amount: Number(deal.costEstimate ?? 0),
          paid: paid.get(id) ?? 0,
          shipped: shipped.get(id) ?? 0,
        }),
      );
    });

    return progress;
  }

  /** Доходные счета и денежные счета. */
  private async splitAccounts(): Promise<{
    incomeIds: number[];
    cashIds: number[];
  }> {
    const accounts = await this.accountModel()
      .query()
      .select(['id', 'accountType']);

    const incomeIds: number[] = [];
    const cashIds: number[] = [];

    accounts.forEach((account: any) => {
      const rootType = AccountTypesUtils.getType(
        account.accountType,
        'rootType',
      );

      if (rootType === ACCOUNT_ROOT_TYPE.INCOME) incomeIds.push(account.id);
      if (
        account.accountType === ACCOUNT_TYPE.BANK ||
        account.accountType === ACCOUNT_TYPE.CASH
      ) {
        cashIds.push(account.id);
      }
    });

    return { incomeIds, cashIds };
  }

  /** Обороты по сделкам. */
  private async sumByDeal(accountIds: number[], dealIds: number[]) {
    if (!accountIds.length) return [];

    return this.transactionModel()
      .query()
      .onBuild((qb) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('projectId');
        qb.select(['projectId']);
        qb.whereIn('accountId', accountIds);
        qb.modify('filterByProjects', dealIds);
      });
  }

  private netByDeal(rows: any[], net: (row: any) => number) {
    const byDeal = new Map<number, number>();

    rows.forEach((row) => {
      const id = Number(row.projectId);
      if (!id) return;

      byDeal.set(id, (byDeal.get(id) ?? 0) + net(row));
    });

    return byDeal;
  }
}
