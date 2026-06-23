import { Injectable } from '@nestjs/common';
import { AmoCrmApiService } from './AmoCrmApi.service';
import { mapAmoContact, mapAmoLead } from './mapAmo';
import { CrmConnector, CrmContact, CrmDeal } from '../../types';
import { CrmSettingsService } from '../../CrmSettings.service';
import { AMOCRM_KEY } from '../../constants';

/**
 * Коннектор amoCRM (⑯b) — вторая реализация `CrmConnector` поверх абстракции ⑯a.
 * Односторонняя синхронизация amoCRM → Bigfin (сделки/контакты).
 */
@Injectable()
export class AmoCrmConnector implements CrmConnector {
  readonly key = AMOCRM_KEY;

  constructor(
    private readonly settings: CrmSettingsService,
    private readonly api: AmoCrmApiService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    const { subdomain, accessToken } = await this.settings.getAmocrm();
    return Boolean(subdomain && accessToken);
  }

  public async fetchContacts(): Promise<CrmContact[]> {
    const { subdomain, accessToken } = await this.settings.getAmocrm();
    if (!subdomain || !accessToken) return [];

    const raw = await this.api.listAll(subdomain, accessToken, 'contacts');
    return raw.map(mapAmoContact);
  }

  public async fetchDeals(): Promise<CrmDeal[]> {
    const { subdomain, accessToken } = await this.settings.getAmocrm();
    if (!subdomain || !accessToken) return [];

    const raw = await this.api.listAll(subdomain, accessToken, 'leads');
    return raw.map(mapAmoLead);
  }
}
