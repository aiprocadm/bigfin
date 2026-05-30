import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import { EditManagementArticleDto } from '../dtos/ManagementArticle.dto';
import { ERRORS } from '../constants';

@Injectable()
export class EditManagementArticleService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly validator: CommandManagementArticleValidatorService,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  /**
   * Edits a management article and re-syncs its account mapping.
   * @param {number} articleId
   * @param {EditManagementArticleDto} dto
   * @returns {Promise<ManagementArticle>}
   */
  public async edit(
    articleId: number,
    dto: EditManagementArticleDto,
  ): Promise<ManagementArticle> {
    const existing = await this.articleModel().query().findById(articleId);
    if (!existing) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }

    await this.validator.validateNameUniqueness(dto.name, articleId);
    await this.validator.validateParentExists(dto.parentId);
    await this.validator.validateNoParentCycle(articleId, dto.parentId);
    await this.validator.validateKindMatchesParent(dto.kind, dto.parentId);
    await this.validator.validateChildrenMatchKind(articleId, dto.kind);
    await this.validator.validateAccountsExist(dto.accountIds);
    await this.validator.validateAccountsMatchKind(dto.kind, dto.accountIds);
    await this.validator.validateAccountsNotMapped(dto.accountIds, articleId);

    const { accountIds, ...articleData } = dto;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const article = await this.articleModel()
        .query(trx)
        .patchAndFetchById(articleId, { ...articleData });

      // Re-sync mapping only when accountIds was explicitly provided.
      if (accountIds) {
        await this.articleAccountModel()
          .query(trx)
          .where('articleId', articleId)
          .delete();

        if (accountIds.length > 0) {
          await this.articleAccountModel()
            .query(trx)
            .insert(
              accountIds.map((accountId) => ({ articleId, accountId })),
            );
        }
      }

      return article;
    });
  }
}
