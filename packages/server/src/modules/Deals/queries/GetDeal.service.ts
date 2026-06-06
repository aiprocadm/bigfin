// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Deal } from '../models/Deal.model';
import { ERRORS } from '../constants';

@Injectable()
export class GetDealService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async getDeal(id: number) {
    const deal = await this.dealModel().query().findById(id);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);
    return deal;
  }
}
