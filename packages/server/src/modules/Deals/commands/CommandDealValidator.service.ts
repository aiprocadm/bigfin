// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Contact } from '@/modules/Contacts/models/Contact';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandDealValidatorService {
  constructor(
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
  ) {}

  public async validateRefs(dto: { contactId?: number }) {
    if (
      dto.contactId &&
      !(await this.contactModel().query().findById(dto.contactId))
    ) {
      throw new ServiceError(ERRORS.CONTACT_NOT_FOUND);
    }
  }
}
