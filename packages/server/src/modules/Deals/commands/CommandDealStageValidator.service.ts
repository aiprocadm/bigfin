// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandDealStageValidatorService {
  constructor(
    @Inject(Deal.name)
    private readonly dealModel: TenantModelProxy<typeof Deal>,
  ) {}

  public async validate(
    dealId: number,
    dto: {
      name?: string;
      plannedRevenue?: number;
      plannedCost?: number;
      status?: string;
      closedDate?: string;
    },
    // При частичном изменении название можно не присылать («просто закрыть
    // этап»), но если прислали — пустым оно быть не может.
    options: { nameRequired?: boolean } = { nameRequired: true },
  ) {
    const deal = await this.dealModel().query().findById(dealId);
    if (!deal) throw new ServiceError(ERRORS.DEAL_NOT_FOUND);

    const nameOmitted = dto.name === undefined;
    if (
      (options.nameRequired !== false || !nameOmitted) &&
      (!dto.name || !dto.name.trim())
    ) {
      throw new ServiceError(ERRORS.STAGE_NAME_REQUIRED);
    }
    // reject negatives and NaN (NaN >= 0 is false); guards direct calls bypassing DTO validation
    if (!(Number(dto.plannedRevenue ?? 0) >= 0) || !(Number(dto.plannedCost ?? 0) >= 0)) {
      throw new ServiceError(ERRORS.STAGE_NEGATIVE_AMOUNT);
    }
    if (dto.status === 'closed' && !dto.closedDate) {
      throw new ServiceError(ERRORS.STAGE_CLOSE_NEEDS_DATE);
    }
  }
}
