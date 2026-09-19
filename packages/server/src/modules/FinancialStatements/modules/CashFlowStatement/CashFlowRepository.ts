import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { Knex } from 'knex';
import { isEmpty } from 'lodash';
import { ModelObject } from 'objection';
import { ICashFlowStatementQuery } from './Cashflow.types';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { INamedModifiableQuery } from '../../common/queryTypes';
import { applyLegalEntityScope } from '@/modules/LegalEntities/utils/legalEntityScope';

@Injectable()
export class CashFlowRepository {
  /**
   * @param {TenantModelProxy<typeof Account>} accountModel - Account model.
   * @param {TenantModelProxy<typeof AccountTransaction>} accountTransactionModel - Account transaction model.
   */
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,
  ) {}

  /**
   * Retrieve the group type from periods type.
   * @param {string} displayType
   * @returns {string}
   */
  protected getGroupTypeFromPeriodsType(displayType: string) {
    const displayTypes = {
      year: 'year',
      day: 'day',
      month: 'month',
      quarter: 'month',
      week: 'day',
    };
    return displayTypes[displayType] || 'month';
  }

  /**
   * Retrieve the cashflow accounts.
   * @returns {Promise<IAccount[]>}
   */
  public async cashFlowAccounts(): Promise<Account[]> {
    const accounts = await this.accountModel().query();
    return accounts;
  }

  /**
   * Retrieve total of csah at beginning transactions.
   * @param {ICashFlowStatementQuery} filter -
   * @return {Promise<IAccountTransaction[]>}
   */
  public async cashAtBeginningTotalTransactions(
    filter: ICashFlowStatementQuery,
  ): Promise<ModelObject<AccountTransaction>[]> {
    const cashBeginningPeriod = moment(filter.fromDate)
      .subtract(1, 'day')
      .toDate();

    const transactions = await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.modify('creditDebitSummation');

        query.select('accountId');
        query.groupBy('accountId');

        query.withGraphFetched('account');
        query.modify('filterDateRange', null, cashBeginningPeriod);

        this.commonFilterBranchesQuery(filter, query);
      });
    return transactions;
  }

  /**
   * Retrieve accounts transactions.
   * @param {ICashFlowStatementQuery} filter
   * @return {Promise<IAccountTransaction>}
   */
  public async getAccountsTransactions(
    filter: ICashFlowStatementQuery,
  ): Promise<ModelObject<AccountTransaction>[]> {
    const groupByDateType = this.getGroupTypeFromPeriodsType(
      filter.displayColumnsBy,
    );
    return await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.modify('creditDebitSummation');
        query.modify('groupByDateFormat', groupByDateType);

        query.select('accountId');

        query.groupBy('accountId');
        query.withGraphFetched('account');

        query.modify('filterDateRange', filter.fromDate, filter.toDate);

        this.commonFilterBranchesQuery(filter, query);
      });
  }

  /**
   * Retrieve the net income tranasctions.
   * @param {number} tenantId -
   * @param {ICashFlowStatementQuery} query -
   * @return {Promise<IAccountTransaction[]>}
   */
  public async getNetIncomeTransactions(
    filter: ICashFlowStatementQuery,
  ): Promise<AccountTransaction[]> {
    const groupByDateType = this.getGroupTypeFromPeriodsType(
      filter.displayColumnsBy,
    );
    return await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.modify('creditDebitSummation');
        query.modify('groupByDateFormat', groupByDateType);

        query.select('accountId');
        query.groupBy('accountId');

        query.withGraphFetched('account');
        query.modify('filterDateRange', filter.fromDate, filter.toDate);

        this.commonFilterBranchesQuery(filter, query);
      });
  }

  /**
   * Retrieve peridos of cash at beginning transactions.
   * @param {ICashFlowStatementQuery} filter -
   * @return {Promise<ModelObject<AccountTransaction>[]>}
   */
  public async cashAtBeginningPeriodTransactions(
    filter: ICashFlowStatementQuery,
  ): Promise<ModelObject<AccountTransaction>[]> {
    const groupByDateType = this.getGroupTypeFromPeriodsType(
      filter.displayColumnsBy,
    );

    return await this.accountTransactionModel()
      .query()
      .onBuild((query) => {
        query.modify('creditDebitSummation');
        query.modify('groupByDateFormat', groupByDateType);

        query.select('accountId');
        query.groupBy('accountId');

        query.withGraphFetched('account');
        query.modify('filterDateRange', filter.fromDate, filter.toDate);

        this.commonFilterBranchesQuery(filter, query);
      });
  }

  /**
   * Общий отбор отчёта: подразделения и юрлица.
   *
   * ОДНО МЕСТО НА ВСЕ ЗАПРОСЫ отчёта: ДДС собирается четырьмя запросами, и
   * отбор, забытый хотя бы в одном, даёт отчёт, который не сходится сам с
   * собой.
   */
  private commonFilterBranchesQuery = (
    query: ICashFlowStatementQuery,
    knexQuery: INamedModifiableQuery,
  ) => {
    if (!isEmpty(query.branchesIds)) {
      knexQuery.modify('filterByBranches', query.branchesIds);
    }
    applyLegalEntityScope(knexQuery, {
      legalEntityIds: (query as any).legalEntityIds,
    });
  };
}
