// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';

import { ACCOUNT_ROOT_TYPE } from '@/constants/accounts';
import { AccountTypesUtils } from '@/libs/accounts-utils/AccountTypesUtils';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Project } from '@/modules/Projects/models/Project.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

import {
  ParetoResult,
  computeParetoContractors,
} from './computeParetoContractors';
import {
  DirectionsProfitResult,
  DirectionsSortBy,
  computeDirectionsProfit,
} from './computeDirectionsProfit';

export interface HomepageInsights {
  topContractors: ParetoResult;
  directionsProfit: DirectionsProfitResult;
}

interface Period {
  fromDate: string;
  toDate: string;
}

/**
 * Два блока главной: «Кто приносит прибыль» и «Прибыльность направлений»
 * (FIN-018 ТЗ-2).
 *
 * ПОЧЕМУ ОДИН СЕРВИС НА ДВА БЛОКА. Оба спрашивают одно и то же — обороты по
 * доходным и расходным счетам за период, — только режут их по-разному: один
 * по контрагенту, другой по направлению. Общий список счетов загружается
 * один раз, а не дважды.
 *
 * ПОЧЕМУ БЕЗ СВЁРТКИ ПО СТАТЬЯМ. Свёртка `ArticlesPlRollup` умеет резать по
 * ОДНОМУ направлению за вызов. Позвать её по разу на каждое направление
 * значило бы сделать столько запросов, сколько у человека направлений, — на
 * главной, которая обязана укладываться в один. Здесь берётся тот же
 * источник, что и у свёртки (обороты по счетам с учётом вида счёта), но
 * сразу с разрезом.
 */
@Injectable()
export class GetHomepageInsightsService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly transactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,

    @Inject(Project.name)
    private readonly projectModel: TenantModelProxy<typeof Project>,
  ) {}

  /**
   * Считает оба блока за период.
   *
   * @param {Period} period границы периода главной
   * @param {DirectionsSortBy} sortBy порядок направлений
   * @returns {Promise<HomepageInsights>}
   */
  public async getInsights(
    period: Period,
    sortBy: DirectionsSortBy = 'profit',
  ): Promise<HomepageInsights> {
    const { incomeIds, expenseIds } = await this.splitAccountsByRootType();

    const [contractorRows, incomeByProject, expenseByProject] =
      await Promise.all([
        this.sumByContact(incomeIds, period),
        this.sumByProject(incomeIds, period),
        this.sumByProject(expenseIds, period),
      ]);

    const [contractors, directions] = await Promise.all([
      this.nameContractors(contractorRows),
      this.nameDirections(incomeByProject, expenseByProject),
    ]);

    return {
      topContractors: computeParetoContractors(contractors),
      directionsProfit: computeDirectionsProfit(directions, sortBy),
    };
  }

  /**
   * Счета доходов и счета расходов.
   *
   * Вид счёта живёт не в базе, а в справочнике типов: колонка хранит ключ
   * вроде `cost-of-goods-sold`, а к какому корню он относится, знает
   * `AccountTypesUtils`. Поэтому разделение делается в коде, а не запросом.
   */
  private async splitAccountsByRootType(): Promise<{
    incomeIds: number[];
    expenseIds: number[];
  }> {
    const accounts = await this.accountModel().query().select(['id', 'accountType']);

    const incomeIds: number[] = [];
    const expenseIds: number[] = [];

    accounts.forEach((account: any) => {
      const rootType = AccountTypesUtils.getType(account.accountType, 'rootType');

      if (rootType === ACCOUNT_ROOT_TYPE.INCOME) incomeIds.push(account.id);
      if (rootType === ACCOUNT_ROOT_TYPE.EXPENSE) expenseIds.push(account.id);
    });

    return { incomeIds, expenseIds };
  }

  /** Выручка по контрагентам за период. */
  private async sumByContact(accountIds: number[], period: Period) {
    if (!accountIds.length) return [];

    return this.transactionModel()
      .query()
      .onBuild((qb) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('contactId');
        qb.select(['contactId']);
        qb.whereIn('accountId', accountIds);
        // Операция без контрагента к вопросу «на ком держится бизнес»
        // отношения не имеет.
        qb.whereNotNull('contactId');
        qb.modify('filterDateRange', period.fromDate, period.toDate);
      });
  }

  /** Обороты по направлениям за период; `projectId` бывает пустым. */
  private async sumByProject(accountIds: number[], period: Period) {
    if (!accountIds.length) return [];

    return this.transactionModel()
      .query()
      .onBuild((qb) => {
        qb.sum('credit as credit');
        qb.sum('debit as debit');
        qb.groupBy('projectId');
        qb.select(['projectId']);
        qb.whereIn('accountId', accountIds);
        qb.modify('filterDateRange', period.fromDate, period.toDate);
      });
  }

  /**
   * Подставляет имена контрагентов.
   *
   * Выручка — это кредит минус дебет: возврат покупателю уменьшает его вклад,
   * иначе клиент, который всё вернул, остался бы в верхушке списка.
   */
  private async nameContractors(rows: any[]) {
    const ids = rows.map((row) => Number(row.contactId)).filter(Boolean);
    if (!ids.length) return [];

    const contacts = await this.contactModel()
      .query()
      .whereIn('id', ids)
      .select(['id', 'displayName']);

    const nameById = new Map<number, string>();
    contacts.forEach((contact: any) =>
      nameById.set(contact.id, contact.displayName),
    );

    return rows.map((row) => ({
      contactId: Number(row.contactId),
      name: nameById.get(Number(row.contactId)) ?? '',
      revenue: Number(row.credit ?? 0) - Number(row.debit ?? 0),
    }));
  }

  /**
   * Складывает доходы и расходы в строки направлений и подставляет имена.
   *
   * Расход — это дебет минус кредит: у расходных счетов нормальная сторона
   * дебетовая, и возврат поставщика уменьшает расход.
   */
  private async nameDirections(incomeRows: any[], expenseRows: any[]) {
    const byProject = new Map<
      number | null,
      { revenue: number; costs: number }
    >();

    const put = (
      rows: any[],
      apply: (bucket: { revenue: number; costs: number }, net: number) => void,
      net: (row: any) => number,
    ) => {
      rows.forEach((row) => {
        const key = row.projectId == null ? null : Number(row.projectId);
        const bucket = byProject.get(key) ?? { revenue: 0, costs: 0 };

        apply(bucket, net(row));
        byProject.set(key, bucket);
      });
    };

    put(
      incomeRows,
      (bucket, value) => {
        bucket.revenue += value;
      },
      (row) => Number(row.credit ?? 0) - Number(row.debit ?? 0),
    );
    put(
      expenseRows,
      (bucket, value) => {
        bucket.costs += value;
      },
      (row) => Number(row.debit ?? 0) - Number(row.credit ?? 0),
    );

    const ids = [...byProject.keys()].filter(
      (key): key is number => key != null,
    );
    const projects = ids.length
      ? await this.projectModel().query().whereIn('id', ids).select(['id', 'name'])
      : [];

    const nameById = new Map<number, string>();
    projects.forEach((project: any) => nameById.set(project.id, project.name));

    return [...byProject.entries()].map(([projectId, bucket]) => ({
      projectId,
      name: projectId == null ? '' : nameById.get(projectId) ?? '',
      revenue: bucket.revenue,
      costs: bucket.costs,
    }));
  }
}
