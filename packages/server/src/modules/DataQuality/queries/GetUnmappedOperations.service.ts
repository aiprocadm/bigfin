// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { AccountTransaction } from '@/modules/Accounts/models/AccountTransaction.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { PL_ACCOUNT_TYPES } from '../constants';
import { DataQualityQueryDto } from '../dtos/DataQualityQuery.dto';
import {
  buildUnmappedAccountsReport,
  filterUnmappedPlAccounts,
  UnmappedOperationsResult,
} from '../utils/unmappedAccounts';

/**
 * «Операции без статьи»: счета P&L-типов без записи в
 * management_article_accounts, у которых есть проводки за период.
 * Read-only, считается на лету из accounts_transactions — без кэш-таблиц.
 */
@Injectable()
export class GetUnmappedOperationsService {
  constructor(
    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(AccountTransaction.name)
    private readonly accountTransactionModel: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  public async getUnmappedOperations(
    query: DataQualityQueryDto,
  ): Promise<UnmappedOperationsResult> {
    const accounts = await this.accountModel()
      .query()
      .whereIn('accountType', PL_ACCOUNT_TYPES);
    const map = await this.articleAccountModel().query();

    const unmapped = filterUnmappedPlAccounts(
      accounts as any[],
      map.map((m) => m.accountId),
    );
    if (unmapped.length === 0) {
      return { accounts: [], totalCount: 0 };
    }
    const rows = await this.accountTransactionModel()
      .query()
      .onBuild((qb) => {
        qb.select([
          'id',
          'accountId',
          'date',
          'credit',
          'debit',
          'referenceType',
          'referenceId',
          'transactionNumber',
          'referenceNumber',
        ]);
        qb.whereIn(
          'accountId',
          unmapped.map((a) => a.id),
        );
        // `filterDateRange` guards each bound independently — open-ended
        // ranges (only-from / only-to) are valid.
        if (query.fromDate || query.toDate) {
          qb.modify('filterDateRange', query.fromDate, query.toDate);
        }
      });

    return buildUnmappedAccountsReport(unmapped, rows as any[]);
  }
}
