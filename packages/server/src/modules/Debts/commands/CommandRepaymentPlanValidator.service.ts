// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Contact } from '@/modules/Contacts/models/Contact';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';
import { CommandRepaymentPlanDto } from '../dtos/RepaymentPlan.dto';

@Injectable()
export class CommandRepaymentPlanValidatorService {
  constructor(
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
  ) {}

  /**
   * Проверяет контрагента и непустой график плана погашения.
   */
  public async validate(dto: CommandRepaymentPlanDto) {
    const contact = await this.contactModel().query().findById(dto.contactId);
    if (!contact) throw new ServiceError(ERRORS.CONTACT_NOT_FOUND);

    if (!dto.installments?.length) {
      throw new ServiceError(ERRORS.EMPTY_INSTALLMENTS);
    }
    const sum = dto.installments.reduce((s, i) => s + Number(i.amount), 0);
    if (sum <= 0) throw new ServiceError(ERRORS.INVALID_PLAN_TOTAL);
  }
}
