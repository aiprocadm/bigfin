import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ManagementArticle } from '../models/ManagementArticle.model';
import { ManagementArticleAccount } from '../models/ManagementArticleAccount.model';
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import { CreateManagementArticleDto } from '../dtos/ManagementArticle.dto';

@Injectable()
export class CreateManagementArticleService {
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
   * Creates a management article and (optionally) maps accounts to it.
   * @param {CreateManagementArticleDto} dto
   * @param {Knex.Transaction} [trx]
   * @returns {Promise<ManagementArticle>}
   */
  public async create(
    dto: CreateManagementArticleDto,
    trx?: Knex.Transaction,
  ): Promise<ManagementArticle> {
    await this.validator.validateNameUniqueness(dto.name);
    await this.validator.validateParentExists(dto.parentId);
    await this.validator.validateKindMatchesParent(dto.kind, dto.parentId);
    await this.validator.validateAccountsExist(dto.accountIds);
    await this.validator.validateAccountsMatchKind(dto.kind, dto.accountIds);
    await this.validator.validateAccountsNotMapped(dto.accountIds);

    const { accountIds, ...articleData } = dto;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const article = await this.articleModel()
        .query(trx)
        .insert({ ...articleData });

      if (accountIds && accountIds.length > 0) {
        await this.articleAccountModel()
          .query(trx)
          .insert(
            accountIds.map((accountId) => ({
              articleId: article.id,
              accountId,
            })),
          );
      }

      return article;
    }, trx);
  }
}
