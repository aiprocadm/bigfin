// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { Contact } from '@/modules/Contacts/models/Contact';
import { Account } from '@/modules/Accounts/models/Account.model';
import { ServiceError } from '@/modules/Items/ServiceError';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ERRORS } from '../constants';

@Injectable()
export class CommandPaymentRequestValidatorService {
  constructor(
    @Inject(ManagementArticle.name)
    private readonly articleModel: TenantModelProxy<typeof ManagementArticle>,

    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,

    @Inject(Account.name)
    private readonly accountModel: TenantModelProxy<typeof Account>,
  ) {}

  /**
   * Проверяет, что заданные ссылки (статья/контрагент/счёт) существуют.
   */
  public async validateRefs(dto: {
    articleId?: number;
    contactId?: number;
    accountId?: number;
  }) {
    if (dto.articleId && !(await this.articleModel().query().findById(dto.articleId))) {
      throw new ServiceError(ERRORS.ARTICLE_NOT_FOUND);
    }
    if (dto.contactId && !(await this.contactModel().query().findById(dto.contactId))) {
      throw new ServiceError(ERRORS.CONTACT_NOT_FOUND);
    }
    if (dto.accountId && !(await this.accountModel().query().findById(dto.accountId))) {
      throw new ServiceError(ERRORS.ACCOUNT_NOT_FOUND);
    }
  }
}
