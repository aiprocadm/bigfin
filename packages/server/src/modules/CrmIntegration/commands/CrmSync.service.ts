import { Injectable } from '@nestjs/common';
import { CrmConnectorRegistry } from '../CrmConnectorRegistry';
import { CrmSyncLinkService } from './CrmSyncLink.service';
import { CrmContact, CrmDeal, CrmSyncResult } from '../types';
import { ServiceError } from '@/modules/Items/ServiceError';
import { CreateCustomer } from '@/modules/Customers/commands/CreateCustomer.service';
import { CreateDealService } from '@/modules/Deals/commands/CreateDeal.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import { EditDealService } from '@/modules/Deals/commands/EditDeal.service';
import { EditCustomer } from '@/modules/Customers/commands/EditCustomer.service';

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
    private readonly editDeal: EditDealService,
    private readonly editCustomer: EditCustomer,
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
      if (await this.upsertContact(connectorKey, c, contactMap, baseCurrency)) {
        contactsImported++;
      } else {
        contactsSkipped++;
      }
    }

    // --- Сделки: создаём недостающие, связываем с контрагентом по карте.
    const dealExternalIds = await this.links.getDealExternalIds(connectorKey);
    let dealsImported = 0;
    let dealsSkipped = 0;

    for (const d of deals) {
      if (await this.upsertDeal(connectorKey, d, contactMap, dealExternalIds)) {
        dealsImported++;
      } else {
        dealsSkipped++;
      }
    }

    return { contactsImported, contactsSkipped, dealsImported, dealsSkipped };
  }

  /**
   * Импортирует ОДНУ каноническую сущность (контакт и/или сделку) — для входящего
   * webhook собственной CRM (⑯c). Идемпотентно через `crm_sync_links`.
   * @param {string} connectorKey
   * @param {{contact?: CrmContact, deal?: CrmDeal}} payload
   */
  public async importCanonical(
    connectorKey: string,
    payload: { contact?: CrmContact; deal?: CrmDeal },
  ): Promise<CrmSyncResult> {
    const result: CrmSyncResult = {
      contactsImported: 0,
      contactsSkipped: 0,
      dealsImported: 0,
      dealsSkipped: 0,
    };
    const baseCurrency = await this.resolveBaseCurrency();
    const contactMap = await this.links.getContactIdMap(connectorKey);

    if (payload.contact) {
      const imported = await this.upsertContact(
        connectorKey,
        payload.contact,
        contactMap,
        baseCurrency,
      );
      imported ? result.contactsImported++ : result.contactsSkipped++;
    }
    if (payload.deal) {
      const dealExternalIds = await this.links.getDealExternalIds(connectorKey);
      const imported = await this.upsertDeal(
        connectorKey,
        payload.deal,
        contactMap,
        dealExternalIds,
      );
      imported ? result.dealsImported++ : result.dealsSkipped++;
    }
    return result;
  }

  /**
   * Заводит контрагента, а если он уже связан — обновляет его данными из CRM.
   * Без обновления правка в CRM (сменили телефон, уточнили название) до
   * Bigfin просто не доезжала. true=создан, false=обновлён либо пропущен.
   */
  private async upsertContact(
    connectorKey: string,
    c: CrmContact,
    contactMap: Map<string, number>,
    baseCurrency: string | undefined,
  ): Promise<boolean> {
    const linkedId = contactMap.get(c.externalId);
    if (linkedId) {
      await this.editCustomer.editCustomer(
        linkedId,
        // Пустые поля из CRM не затирают заполненное в Bigfin.
        this.withoutEmpty({
          displayName: c.displayName,
          inn: c.inn,
          email: c.email,
          workPhone: c.phone,
          companyName: c.companyName,
        }) as any,
      );
      return false;
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
    return true;
  }

  /**
   * Заводит сделку, а если она уже связана — обновляет её данными из CRM:
   * поменяли сумму или срок в CRM — это должно доехать до Bigfin.
   * true=создана, false=обновлена либо пропущена.
   */
  private async upsertDeal(
    connectorKey: string,
    d: CrmDeal,
    contactMap: Map<string, number>,
    dealExternalIds: Set<string>,
  ): Promise<boolean> {
    const contactId0 = d.contactExternalId
      ? contactMap.get(d.contactExternalId) ?? null
      : null;

    if (dealExternalIds.has(d.externalId)) {
      const linkedId = await this.links.getEntityId(
        connectorKey,
        d.externalId,
        'deal',
      );
      if (linkedId) {
        await this.editDeal.edit(
          linkedId,
          this.withoutEmpty({
            name: d.name,
            costEstimate: d.amount,
            contactId: contactId0,
            deadline: d.closedAt,
          }) as any,
        );
      }
      return false;
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
    dealExternalIds.add(d.externalId);
    return true;
  }

  /**
   * Убирает пустые значения: CRM может не прислать поле, и это не повод
   * стирать уже заполненное в Bigfin.
   */
  private withoutEmpty(
    values: Record<string, unknown>,
  ): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => value !== null && value !== undefined && value !== '',
      ),
    );
  }

  /** Базовая валюта организации для создаваемых контрагентов. */
  private async resolveBaseCurrency(): Promise<string | undefined> {
    const tenant = await this.tenancyContext.getTenant(true);
    return tenant?.metadata?.baseCurrency;
  }
}
