// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { ACCOUNT_TYPE } from '@/constants/accounts';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import {
  ContactDebtPosition,
  DebtBreakdownResult,
  computeDebtBreakdown,
} from './computeDebtBreakdown';

export interface DebtBreakdownQuery {
  /** Ограничить список; пусто — все контрагенты с долгом. */
  contactIds?: number[];
  /** На какую дату; пусто — на сегодня. */
  asDate?: string;
}

/**
 * Денежная и неденежная задолженность по контрагентам (FIN-023 ТЗ-2).
 *
 * ЧТО ОТСЮДА БЕРЁТСЯ. Сальдо расчётов: по счетам дебиторской задолженности и
 * по счетам кредиторской. Знак сальдо и есть ответ на вопрос «чем закроется»:
 * положительная дебиторка — нам должны деньги, отрицательная — мы взяли аванс
 * и должны исполнение.
 *
 * ПОЧЕМУ НЕ ЧЕРЕЗ `contacts.balance`. Эта колонка хранит одно число на
 * контрагента и не разделяет стороны: контрагент, который одновременно
 * покупатель и поставщик, схлопывается в одну сумму, и разбор становится
 * невозможен. Здесь стороны считаются отдельно и остаются раздельными.
 *
 * ОТЧЁТЫ СТАРЕНИЯ НЕ ТРОГАЕМ (приёмка 4 FIN-023). Это отдельный расчёт с
 * другим вопросом — «насколько просрочено», — и он уже принят владельцем.
 */
@Injectable()
export class GetContactDebtBreakdownService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Разбор долга по контрагентам.
   *
   * @param {DebtBreakdownQuery} query отбор
   * @returns {Promise<DebtBreakdownResult>}
   */
  public async getDebtBreakdown(
    query: DebtBreakdownQuery = {},
  ): Promise<DebtBreakdownResult> {
    const [receivableIds, payableIds] = await Promise.all([
      this.accountIdsOfType(ACCOUNT_TYPE.ACCOUNTS_RECEIVABLE),
      this.accountIdsOfType(ACCOUNT_TYPE.ACCOUNTS_PAYABLE),
    ]);

    const [receivableRows, payableRows] = await Promise.all([
      this.sumByContact(receivableIds, query),
      this.sumByContact(payableIds, query),
    ]);

    const positions = new Map<number, ContactDebtPosition>();

    const take = (rows: any[], apply: (net: number, into: ContactDebtPosition) => void, net: (row: any) => number) => {
      rows.forEach((row) => {
        const contactId = Number(row.contactId);
        if (!contactId) return;

        const position = positions.get(contactId) ?? {
          contactId,
          receivableNet: 0,
          payableNet: 0,
        };

        apply(net(row), position);
        positions.set(contactId, position);
      });
    };

    // Дебиторка — счёт с дебетовой нормальной стороной: отгрузили в дебет,
    // получили деньги в кредит.
    take(
      receivableRows,
      (net, position) => {
        position.receivableNet += net;
      },
      (row) => Number(row.debit ?? 0) - Number(row.credit ?? 0),
    );
    // Кредиторка — кредитовая: получили счёт в кредит, заплатили в дебет.
    take(
      payableRows,
      (net, position) => {
        position.payableNet += net;
      },
      (row) => Number(row.credit ?? 0) - Number(row.debit ?? 0),
    );

    return computeDebtBreakdown([...positions.values()]);
  }

  /** Счета одного вида: дебиторка или кредиторка. */
  private async accountIdsOfType(accountType: string): Promise<number[]> {
    const accounts = await this.accountModel()
      .query()
      .where('accountType', accountType)
      .select(['id']);

    return accounts.map((account: any) => account.id);
  }

  /** Сальдо по контрагентам на дату. */
  private async sumByContact(accountIds: number[], query: DebtBreakdownQuery) {
    if (!accountIds.length) return [];

    return this.transactionModel()
      .query()
      .onBuild((qb) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('contactId');
        qb.select(['contactId']);
        qb.whereIn('accountId', accountIds);
        qb.whereNotNull('contactId');

        // САЛЬДО — ЭТО НАКОПЛЕННОЕ, А НЕ ОБОРОТ ЗА ПЕРИОД. Поэтому нижней
        // границы нет: берётся всё до указанной даты включительно.
        if (query.asDate) {
          qb.modify('filterDateRange', null, query.asDate);
        }
        if (query.contactIds?.length) {
          qb.modify('filterContactIds', query.contactIds);
        }
      });
  }
}
