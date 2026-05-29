import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetManagementArticleService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  /**
   * Retrieves a single management article with its mapped accounts.
   * @param {number} articleId
   * @returns {Promise<ManagementArticle>}
   */
  public async getManagementArticle(
    articleId: number,
  ): Promise<ManagementArticle> {
    const article = await this.articleModel()
      .query()
      .findById(articleId)
      .withGraphFetched('accounts');

    if (!article) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }
    return article;
  }
}
