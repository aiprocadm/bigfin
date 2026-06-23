import { Injectable } from '@nestjs/common';
import { CrmConnectorRegistry } from '../CrmConnectorRegistry';
import { CrmSyncLinkService } from './CrmSyncLink.service';
import { CrmSyncResult } from '../types';
import { ServiceError } from '@/modules/Items/ServiceError';
import { CreateCustomer } from '@/modules/Customers/commands/CreateCustomer.service';
import { CreateDealService } from '@/modules/Deals/commands/CreateDeal.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';

export const ERRORS = {
  CONNECTOR_NOT_FOUND: 'CRM_CONNECTOR_NOT_FOUND',
  CONNECTOR_NOT_CONFIGURED: 'CRM_CONNECTOR_NOT_CONFIGURED',
};

/**
 * Движок односторонней синхронизации CRM → Bigfin (§4.11 / ⑯a).
 * Тянет контрагентов и сделки из выбранного коннектора, маппит в Bigfin
 * `Customer`/`Deal`, не задваивая уже импортированное (таблица `crm_sync_links`).
 */
@Injectable()
export class CrmSyncService {
  constructor(
    private readonly registry: CrmConnectorRegistry,
    private readonly links: CrmSyncLinkService,
    private readonly createCustomer: CreateCustomer,
    private readonly createDeal: CreateDealService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  /**
   * Прогоняет синхронизацию по ключу коннектора. Идемпотентна: повторный прогон
   * не создаёт дубли (сверяется с `crm_sync_links`).
   * @param {string} connectorKey — 'bitrix24' и т.п.
   */
  public async sync(connectorKey: string): Promise<CrmSyncResult> {
    const connector = this.registry.get(connectorKey);
    if (!connector) throw new ServiceError(ERRORS.CONNECTOR_NOT_FOUND);
    if (!(await connector.isConfigured())) {
      throw new ServiceError(ERRORS.CONNECTOR_NOT_CONFIGURED);
    }

    const [contacts, deals] = await Promise.all([
      connector.fetchContacts(),
      connector.fetchDeals(),
    ]);

    const baseCurrency = await this.resolveBaseCurrency();

    // --- Контрагенты: создаём недостающие, копим карту externalId → bigfinId.
    const contactMap = await this.links.getContactIdMap(connectorKey);
    let contactsImported = 0;
    let contactsSkipped = 0;

    for (const c of contacts) {
      if (contactMap.has(c.externalId)) {
        contactsSkipped++;
        continue;
      }
      const customer = await this.createCustomer.createCustomer({
        customerType: 'business',
        displayName: c.displayName,
        currencyCode: baseCurrency,
        inn: c.inn ?? undefined,
        email: c.email ?? undefined,
        workPhone: c.phone ?? undefined,
        companyName: c.companyName ?? undefined,
      } as any);
      await this.links.record(connectorKey, c.externalId, 'contact', customer.id);
      contactMap.set(c.externalId, customer.id);
      contactsImported++;
    }

    // --- Сделки: создаём недостающие, связываем с контрагентом по карте.
    const dealExternalIds = await this.links.getDealExternalIds(connectorKey);
    let dealsImported = 0;
    let dealsSkipped = 0;

    for (const d of deals) {
      if (dealExternalIds.has(d.externalId)) {
        dealsSkipped++;
        continue;
      }
      const contactId = d.contactExternalId
        ? contactMap.get(d.contactExternalId) ?? null
        : null;
      const deal = await this.createDeal.create({
        name: d.name,
        costEstimate: d.amount ?? undefined,
        contactId: contactId ?? undefined,
        deadline: d.closedAt ?? undefined,
      } as any);
      await this.links.record(connectorKey, d.externalId, 'deal', deal.id);
      dealsImported++;
    }

    return { contactsImported, contactsSkipped, dealsImported, dealsSkipped };
  }

  /** Базовая валюта организации для создаваемых контрагентов. */
  private async resolveBaseCurrency(): Promise<string | undefined> {
    const tenant = await this.tenancyContext.getTenant(true);
    return tenant?.metadata?.baseCurrency;
  }
}
