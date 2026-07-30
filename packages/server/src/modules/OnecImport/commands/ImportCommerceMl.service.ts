import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { decodeXmlBuffer, parseXml } from '../utils/parseXml';
import {
  CommerceMlContact,
  CommerceMlItem,
  extractContacts,
  extractItems,
} from '../utils/extractCommerceMl';
import { OnecImportLink } from '../models/OnecImportLink.model';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Item } from '@/modules/Items/models/Item';
import { Contact } from '@/modules/Contacts/models/Contact';
import { CreateItemService } from '@/modules/Items/CreateItem.service';
import { CreateCustomer } from '@/modules/Customers/commands/CreateCustomer.service';

export interface OnecImportCounters {
  created: number;
  updated: number;
  skipped: number;
}

export interface OnecPreviewCounters {
  toCreate: number;
  toUpdate: number;
  skipped: number;
}

export interface OnecImportReport {
  items: OnecImportCounters;
  contacts: OnecImportCounters;
}

export interface OnecPreviewReport {
  items: OnecPreviewCounters;
  contacts: OnecPreviewCounters;
}

const ENTITY_ITEM = 'item';
const ENTITY_CONTACT = 'contact';

/**
 * Импорт справочников CommerceML из 1С (⑩): товары и контрагенты.
 * Идемпотентность — через таблицу связей `onec_import_links`; при отсутствии
 * связи ищем совпадение по ИНН (контрагент) либо артикулу (товар), чтобы не
 * задваивать карточки, заведённые руками до обмена.
 */
@Injectable()
export class ImportCommerceMlService {
  constructor(
    private readonly uow: UnitOfWork,

    @Inject(OnecImportLink.name)
    private readonly linkModel: TenantModelProxy<typeof OnecImportLink>,

    @Inject(Item.name)
    private readonly itemModel: TenantModelProxy<typeof Item>,

    @Inject(Contact.name)
    private readonly contactModel: TenantModelProxy<typeof Contact>,

    private readonly createItemService: CreateItemService,
    private readonly createCustomerService: CreateCustomer,
  ) {}

  /** Разбирает файл, ничего не записывая: что создастся, что обновится. */
  public async preview(buffer: Buffer): Promise<OnecPreviewReport> {
    const { items, contacts } = this.parse(buffer);

    const itemsReport: OnecPreviewCounters = {
      toCreate: 0,
      toUpdate: 0,
      skipped: 0,
    };
    for (const item of items) {
      const existing = await this.findItemId(item);
      existing ? itemsReport.toUpdate++ : itemsReport.toCreate++;
    }

    const contactsReport: OnecPreviewCounters = {
      toCreate: 0,
      toUpdate: 0,
      skipped: 0,
    };
    for (const contact of contacts) {
      const existing = await this.findContactId(contact);
      existing ? contactsReport.toUpdate++ : contactsReport.toCreate++;
    }
    return { items: itemsReport, contacts: contactsReport };
  }

  /** Создаёт и обновляет карточки в одной транзакции. */
  public async import(buffer: Buffer): Promise<OnecImportReport> {
    const { items, contacts } = this.parse(buffer);

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      const itemsReport: OnecImportCounters = {
        created: 0,
        updated: 0,
        skipped: 0,
      };
      for (const item of items) {
        const existingId = await this.findItemId(item, trx);

        if (existingId) {
          await this.itemModel()
            .query(trx)
            .findById(existingId)
            .patch(this.itemPatch(item));
          itemsReport.updated++;
        } else {
          const id = await this.createItemService.createItem(
            {
              name: item.name,
              type: 'service',
              code: item.sku ?? undefined,
              // Счета продаж/закупок из выгрузки неизвестны — карточка
              // создаётся справочной, пользователь дозаполнит при первом
              // использовании.
              sellable: false,
              purchasable: false,
              note: item.description ?? undefined,
            } as any,
            trx,
          );
          await this.link(ENTITY_ITEM, item.externalId, Number(id), trx);
          itemsReport.created++;
        }
      }

      const contactsReport: OnecImportCounters = {
        created: 0,
        updated: 0,
        skipped: 0,
      };
      for (const contact of contacts) {
        const existingId = await this.findContactId(contact, trx);

        if (existingId) {
          await this.contactModel()
            .query(trx)
            .findById(existingId)
            .patch(this.contactPatch(contact));
          await this.link(
            ENTITY_CONTACT,
            contact.externalId,
            existingId,
            trx,
          );
          contactsReport.updated++;
        } else {
          const created: any = await this.createCustomerService.createCustomer(
            {
              displayName: contact.name,
              companyName: contact.fullName ?? contact.name,
              inn: contact.inn ?? undefined,
              kpp: contact.kpp ?? undefined,
              currencyCode: 'RUB',
            } as any,
            trx,
          );
          await this.link(
            ENTITY_CONTACT,
            contact.externalId,
            Number(created?.id ?? created),
            trx,
          );
          contactsReport.created++;
        }
      }
      return { items: itemsReport, contacts: contactsReport };
    });
  }

  private parse(buffer: Buffer): {
    items: CommerceMlItem[];
    contacts: CommerceMlContact[];
  } {
    const root = parseXml(decodeXmlBuffer(buffer));
    return { items: extractItems(root), contacts: extractContacts(root) };
  }

  /** Обновление не затирает заполненные поля Bigfin пустыми из 1С. */
  private itemPatch(item: CommerceMlItem): Record<string, unknown> {
    const patch: Record<string, unknown> = { name: item.name };
    if (item.sku) patch.code = item.sku;
    if (item.description) patch.note = item.description;
    return patch;
  }

  private contactPatch(contact: CommerceMlContact): Record<string, unknown> {
    const patch: Record<string, unknown> = { displayName: contact.name };
    if (contact.fullName) patch.companyName = contact.fullName;
    if (contact.inn) patch.inn = contact.inn;
    if (contact.kpp) patch.kpp = contact.kpp;
    return patch;
  }

  private async findItemId(
    item: CommerceMlItem,
    trx?: Knex.Transaction,
  ): Promise<number | null> {
    const link = await this.linkModel()
      .query(trx)
      .findOne({ entityType: ENTITY_ITEM, externalId: item.externalId });
    if (link) return link.entityId;

    if (item.sku) {
      const byCode = await this.itemModel()
        .query(trx)
        .findOne({ code: item.sku });
      if (byCode) return byCode.id;
    }
    return null;
  }

  private async findContactId(
    contact: CommerceMlContact,
    trx?: Knex.Transaction,
  ): Promise<number | null> {
    const link = await this.linkModel()
      .query(trx)
      .findOne({ entityType: ENTITY_CONTACT, externalId: contact.externalId });
    if (link) return link.entityId;

    if (contact.inn) {
      const byInn = await this.contactModel()
        .query(trx)
        .findOne({ inn: contact.inn });
      if (byInn) return byInn.id;
    }
    return null;
  }

  private async link(
    entityType: string,
    externalId: string,
    entityId: number,
    trx?: Knex.Transaction,
  ): Promise<void> {
    const existing = await this.linkModel()
      .query(trx)
      .findOne({ entityType, externalId });
    if (existing) return;

    await this.linkModel().query(trx).insert({
      entityType,
      externalId,
      entityId,
    } as any);
  }
}
