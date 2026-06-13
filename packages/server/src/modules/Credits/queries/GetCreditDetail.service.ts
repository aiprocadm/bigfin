// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ServiceError } from '@/modules/Items/ServiceError';
import { Credit } from '../models/Credit.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetCreditDetailService {
  constructor(
    @Inject(Credit.name)
    private readonly creditModel: TenantModelProxy<typeof Credit>,
  ) {}

  public async getCredit(id: number) {
    const credit = await this.creditModel()
      .query()
      .findById(id)
      .withGraphFetched('installments(orderBySeq)')
      .modifiers({
        orderBySeq: (q: any) => q.orderBy('seqNo', 'asc'),
      });
    if (!credit) throw new ServiceError(ERRORS.CREDIT_NOT_FOUND);
    return credit;
  }
}
