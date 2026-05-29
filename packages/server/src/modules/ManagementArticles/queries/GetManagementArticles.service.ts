import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { GetManagementArticlesQueryDto } from '../dtos/GetManagementArticlesQuery.dto';
import { GetManagementArticlesResponse } from '../ManagementArticle.interfaces';
import { buildArticleTree } from '../utils/buildArticleTree';

@Injectable()
export class GetManagementArticlesService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  /**
   * Retrieves management articles as a flat list or nested tree.
   * @param {GetManagementArticlesQueryDto} filterDto
   * @returns {Promise<GetManagementArticlesResponse>}
   */
  public async getManagementArticles(
    filterDto: GetManagementArticlesQueryDto,
  ): Promise<GetManagementArticlesResponse> {
    const articles = await this.articleModel()
      .query()
      .onBuild((query) => {
        if (filterDto.kind) {
          query.where('kind', filterDto.kind);
        }
        query.orderBy('sortOrder', 'asc');
      });

    const data =
      filterDto.tree === 'true'
        ? (buildArticleTree(articles) as unknown as ManagementArticle[])
        : articles;

    return { data };
  }
}
