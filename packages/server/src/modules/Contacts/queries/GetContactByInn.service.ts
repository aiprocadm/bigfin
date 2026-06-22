import { Inject, Injectable } from '@nestjs/common';
import { Contact } from '../models/Contact';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';

@Injectable()
export class GetContactByInnService {
  constructor(
    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,
  ) {}

  /**
   * Возвращает первого контрагента с данным ИНН или undefined.
   * @param {string} inn - ИНН контрагента (10 или 12 цифр)
   */
  public async getByInn(inn: string): Promise<Contact | undefined> {
    if (!inn) return undefined;
    return this.contactModel().query().findOne({ inn });
  }
}
