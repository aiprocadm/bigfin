// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ManagementArticleAccount } from '@/modules/ManagementArticles/models/ManagementArticleAccount.model';
import { ACCOUNT_TYPE } from '@/constants/accounts';
import { FixedAsset } from '../models/FixedAsset.model';
import { linearDepreciation } from '../utils/linearDepreciation';
import {
  ERRORS,
  DEPRECIATION_EXPENSE_ACCOUNT,
  DEPRECIATION_ARTICLE,
} from '../constants';
import { CreateFixedAssetDto } from '../dtos/FixedAsset.dto';

@Injectable()
export class CreateFixedAssetService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly tenancyContext: TenancyContext,

    @Inject(FixedAsset.name)
    private readonly assetModel: TenantModelProxy<typeof FixedAsset>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,

    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(ManagementArticleAccount.name)
    private readonly articleAccountModel: TenantModelProxy<
      typeof ManagementArticleAccount
    >,
  ) {}

  public async create(dto: CreateFixedAssetDto) {
    if (!(Number(dto.cost) > 0)) {
      throw new ServiceError(ERRORS.INVALID_AMOUNT);
    }
    const metadata: any = await this.tenancyContext.getTenantMetadata();
    const currencyCode = metadata?.baseCurrency;

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const assetAccount: any = await this.accountModel()
        .query(trx)
        .findById(dto.assetAccountId);
      if (!assetAccount) throw new ServiceError(ERRORS.ASSET_ACCOUNT_NOT_FOUND);
      if (
        ![ACCOUNT_TYPE.FIXED_ASSET, ACCOUNT_TYPE.NON_CURRENT_ASSET].includes(
          assetAccount.accountType,
        )
      ) {
        throw new ServiceError(ERRORS.ASSET_ACCOUNT_NOT_FIXED);
      }

      const expenseAccount = await this.findOrCreateExpenseAccount(
        currencyCode,
        trx,
      );
      await this.findOrCreateDepreciationArticle(expenseAccount.id, trx);

      const schedule = linearDepreciation({
        cost: Number(dto.cost),
        salvageValue: Number(dto.salvageValue ?? 0),
        serviceLifeMonths: Number(dto.serviceLifeMonths),
        commissionedAt: dto.commissionedAt,
      });

      const asset: any = await this.assetModel()
        .query(trx)
        .insertGraph({
          name: dto.name,
          category: dto.category ?? null,
          cost: dto.cost,
          salvageValue: dto.salvageValue ?? 0,
          serviceLifeMonths: dto.serviceLifeMonths,
          commissionedAt: dto.commissionedAt,
          assetAccountId: dto.assetAccountId,
          accumulatedDepreciation: 0,
          status: 'active',
          note: dto.note ?? null,
          entries: schedule.map((r) => ({
            period: r.period,
            seqNo: r.seqNo,
            amount: r.amount,
            status: 'planned',
          })),
        } as any);

      return this.assetModel()
        .query(trx)
        .findById(asset.id)
        .withGraphFetched('entries');
    });
  }

  private async findOrCreateExpenseAccount(
    currencyCode: string,
    trx: Knex.Transaction,
  ) {
    let account: any = await this.accountModel()
      .query(trx)
      .findOne({ slug: DEPRECIATION_EXPENSE_ACCOUNT.slug });
    if (!account) {
      account = await this.accountModel()
        .query(trx)
        .insertAndFetch({ ...DEPRECIATION_EXPENSE_ACCOUNT, currencyCode } as any);
    }
    return account;
  }

  private async findOrCreateDepreciationArticle(
    accountId: number,
    trx: Knex.Transaction,
  ) {
    let article: any = await this.articleModel()
      .query(trx)
      .findOne({ name: DEPRECIATION_ARTICLE.name, kind: 'expense' });
    if (!article) {
      article = await this.articleModel()
        .query(trx)
        .insertAndFetch({ ...DEPRECIATION_ARTICLE, parentId: null } as any);
    }
    const mapping = await this.articleAccountModel()
      .query(trx)
      .findOne({ articleId: article.id, accountId });
    if (!mapping) {
      await this.articleAccountModel()
        .query(trx)
        .insert({ articleId: article.id, accountId } as any);
    }
    return article;
  }
}
