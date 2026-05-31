import { Inject, Injectable } from '@nestjs/common';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandPlannedOperationValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Validates the referenced management article exists (when given).
   */
  public async validateArticleExists(articleId?: number) {
    if (!articleId) return;

    const article = await this.articleModel().query().findById(articleId);
    if (!article) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }
  }

  /**
   * Validates the referenced cash/bank account exists (when given).
   */
  public async validateAccountExists(accountId?: number) {
    if (!accountId) return;

    const account = await this.accountModel().query().findById(accountId);
    if (!account) {
      throw new ServiceError(ERRORS.ACCOUNT_NOT_FOUND);
    }
  }
}
