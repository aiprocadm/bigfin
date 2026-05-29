import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { ERRORS } from '../constants';

@Injectable()
export class CommandManagementArticleValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Validates the article name is unique (optionally excluding one id).
   */
  public async validateNameUniqueness(name: string, notArticleId?: number) {
    const found = await this.articleModel()
      .query()
      .findOne('name', name)
      .onBuild((query) => {
        if (notArticleId) {
          query.whereNot('id', notArticleId);
        }
      });

    if (found) {
      throw new ServiceError(ERRORS.ARTICLE_NAME_EXISTS);
    }
  }

  /**
   * Validates the parent article exists (when parentId is given).
   */
  public async validateParentExists(parentId?: number) {
    if (!parentId) return;

    const parent = await this.articleModel().query().findById(parentId);
    if (!parent) {
      throw new ServiceError(ERRORS.PARENT_ARTICLE_NOT_FOUND);
    }
  }

  /**
   * Validates all given account ids exist.
   */
  public async validateAccountsExist(accountIds?: number[]) {
    if (!accountIds || accountIds.length === 0) return;

    const count = await this.accountModel()
      .query()
      .whereIn('id', accountIds)
      .resultSize();

    if (count !== accountIds.length) {
      throw new ServiceError(ERRORS.ACCOUNT_NOT_FOUND);
    }
  }

  /**
   * Validates none of the given accounts is already mapped to another article.
   * Enforces the v1 rule: one account belongs to exactly one article.
   */
  public async validateAccountsNotMapped(
    accountIds?: number[],
    ownArticleId?: number,
  ) {
    if (!accountIds || accountIds.length === 0) return;

    const conflicting = await this.articleAccountModel()
      .query()
      .whereIn('accountId', accountIds)
      .onBuild((query) => {
        if (ownArticleId) {
          query.whereNot('articleId', ownArticleId);
        }
      });

    if (conflicting.length > 0) {
      throw new ServiceError(ERRORS.ACCOUNT_ALREADY_MAPPED);
    }
  }
}
