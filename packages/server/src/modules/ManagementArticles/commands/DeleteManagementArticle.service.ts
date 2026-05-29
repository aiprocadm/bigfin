import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ERRORS } from '../constants';

@Injectable()
export class DeleteManagementArticleService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  /**
   * Deletes a management article. Mapped accounts are removed via ON DELETE
   * CASCADE on management_article_accounts. Refuses if the article has children.
   * @param {number} articleId
   */
  public async delete(articleId: number) {
    const article = await this.articleModel().query().findById(articleId);
    if (!article) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }

    const childrenCount = await this.articleModel()
      .query()
      .where('parentId', articleId)
      .resultSize();

    if (childrenCount > 0) {
      throw new ServiceError(ERRORS.ARTICLE_HAS_CHILDREN);
    }

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      await this.articleModel().query(trx).deleteById(articleId);
    });
  }
}
