// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandCostAllocationValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,
  ) {}

  public async validate(dto: {
    sourceArticleId: number;
    allocationKey: string;
    manualShares?: Record<string, number>;
    validFrom?: string;
    validTo?: string;
  }) {
    const article: any = await this.articleModel().query().findById(dto.sourceArticleId);
    if (!article) throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    if (article.kind !== 'expense') throw new ServiceError(ERRORS.ARTICLE_NOT_EXPENSE);

    if (dto.allocationKey === 'manual_share') {
      const shares = dto.manualShares ?? {};
      const entries = Object.entries(shares);
      const ok = entries.length > 0 && entries.every(([, w]) => Number(w) >= 0);
      if (!ok) throw new ServiceError(ERRORS.INVALID_MANUAL_SHARES);
    }

    if (dto.validFrom && dto.validTo && dto.validFrom > dto.validTo) {
      throw new ServiceError(ERRORS.INVALID_DATE_RANGE);
    }
  }
}
