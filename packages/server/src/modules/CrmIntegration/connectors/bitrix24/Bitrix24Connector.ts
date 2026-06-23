import { Injectable } from '@nestjs/common';
import { Bitrix24ApiService } from './Bitrix24Api.service';
import { mapBitrixContact, mapBitrixDeal } from './mapBitrix';
import { CrmConnector, CrmContact, CrmDeal } from '../../types';
import { CrmSettingsService } from '../../CrmSettings.service';
import { BITRIX24_KEY } from '../../constants';

/**
 * Коннектор Битрикс24 (⑯a) — реализация `CrmConnector`. Односторонняя
 * синхронизация Битрикс → Bigfin через REST входящего webhook.
 */
@Injectable()
export class Bitrix24Connector implements CrmConnector {
  readonly key = BITRIX24_KEY;

  constructor(
    private readonly settings: CrmSettingsService,
    private readonly api: Bitrix24ApiService,
  ) {}

  public async isConfigured(): Promise<boolean> {
    return Boolean(await this.settings.getBitrix24WebhookUrl());
  }

  public async fetchContacts(): Promise<CrmContact[]> {
    const url = await this.settings.getBitrix24WebhookUrl();
    if (!url) return [];

    const raw = await this.api.listAll(url, 'crm.contact.list', {
      select: ['ID', 'NAME', 'LAST_NAME', 'COMPANY_TITLE', 'EMAIL', 'PHONE', 'UF_*'],
    });
    return raw.map(mapBitrixContact);
  }

  public async fetchDeals(): Promise<CrmDeal[]> {
    const url = await this.settings.getBitrix24WebhookUrl();
    if (!url) return [];

    const raw = await this.api.listAll(url, 'crm.deal.list', {
      select: ['ID', 'TITLE', 'OPPORTUNITY', 'CONTACT_ID', 'CLOSEDATE'],
    });
    return raw.map(mapBitrixDeal);
  }
}
