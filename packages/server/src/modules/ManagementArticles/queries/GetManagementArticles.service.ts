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
    const asTree = filterDto.tree === 'true';

    const articles = await this.articleModel()
      .query()
      .onBuild((query) => {
        // In tree mode we must NOT filter by kind in the query: dropping a
        // parent whose child matches would orphan that child into a fake root.
        // Instead we fetch the whole forest and prune by root kind below.
        if (filterDto.kind && !asTree) {
          query.where('kind', filterDto.kind);
        }
        query.orderBy('sortOrder', 'asc');
      });

    if (!asTree) {
      return { data: articles };
    }

    let tree = buildArticleTree(articles) as unknown as ManagementArticle[];
    if (filterDto.kind) {
      tree = tree.filter((root) => (root as any).kind === filterDto.kind);
    }

    return { data: tree };
  }
}
