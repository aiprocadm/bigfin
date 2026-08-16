import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ERRORS } from '../constants';

/**
 * Таблицы, которые ссылаются на статью учёта. Если хоть в одной есть строка с
 * этим articleId — статью удалять нельзя (иначе ссылка осиротеет). При
 * появлении нового потребителя статьи его таблицу нужно добавить сюда.
 */
const ARTICLE_CONSUMERS: Array<[table: string, column: string]> = [
  ['management_article_accounts', 'article_id'],
  ['planned_operations', 'article_id'],
  ['budget_lines', 'article_id'],
  ['payment_requests', 'article_id'],
];

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
      // Нельзя удалить используемую статью — иначе её ссылки осиротеют.
      for (const [table, column] of ARTICLE_CONSUMERS) {
        const used = await trx(table).where(column, articleId).first();
        if (used) {
          throw new ServiceError(ERRORS.ARTICLE_IN_USE);
        }
      }
      await this.articleModel().query(trx).deleteById(articleId);
    });
  }
}
