// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { UnitOfWork } from '@/modules/Tenancy/TenancyDB/UnitOfWork.service';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { Item } from '@/modules/Items/models/Item';
import { CreateItemService } from '@/modules/Items/CreateItem.service';
import { MoyskladSettingsService } from '../MoyskladSettings.service';
import { MoyskladApiService } from '../MoyskladApi.service';
import { MoyskladImportLink } from '../models/MoyskladImportLink.model';
import { mapMoyskladProduct, MoyskladProduct } from '../mapMoysklad';

export interface MoyskladImportPreview {
  toCreate: number;
  toUpdate: number;
  skipped: number;
  /** Первые товары — показать пользователю, что именно приедет. */
  sample: MoyskladProduct[];
}

export interface MoyskladImportResult {
  created: number;
  updated: number;
  skipped: number;
}

const ENTITY_ITEM = 'item';
const SAMPLE_SIZE = 20;

/**
 * ㉛ Импорт справочника товаров МойСклад в карточки Bigfin — вместе с
 * себестоимостью (`buyPrice`) и ценой продажи. Идемпотентность через
 * `moysklad_import_links`; при отсутствии связи товар ищется по артикулу,
 * чтобы не задваивать заведённые руками карточки.
 */
@Injectable()
export class ImportMoyskladProductsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly settings: MoyskladSettingsService,
    private readonly api: MoyskladApiService,

    @Inject(MoyskladImportLink.name)
    private readonly linkModel: TenantModelProxy<typeof MoyskladImportLink>,

    @Inject(Item.name)
    private readonly itemModel: TenantModelProxy<typeof Item>,

    private readonly createItemService: CreateItemService,
  ) {}

  /** Разбирает справочник, ничего не записывая. */
  public async preview(): Promise<MoyskladImportPreview> {
    const products = await this.fetchProducts();

    let toCreate = 0;
    let toUpdate = 0;
    let skipped = 0;

    for (const product of products) {
      if (!this.isImportable(product)) {
        skipped += 1;
        continue;
      }
      const existing = await this.findItemId(product);
      existing ? (toUpdate += 1) : (toCreate += 1);
    }
    return {
      toCreate,
      toUpdate,
      skipped,
      sample: products.filter((p) => this.isImportable(p)).slice(0, SAMPLE_SIZE),
    };
  }

  /** Создаёт и обновляет карточки в одной транзакции. */
  public async import(): Promise<MoyskladImportResult> {
    const products = await this.fetchProducts();

    return this.uow.withTransaction(async (trx: Knex.Transaction) => {
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const product of products) {
        if (!this.isImportable(product)) {
          skipped += 1;
          continue;
        }
        const existingId = await this.findItemId(product, trx);

        if (existingId) {
          await this.itemModel()
            .query(trx)
            .findById(existingId)
            .patch(this.patchFor(product));
          await this.link(product.externalId, existingId, trx);
          updated += 1;
        } else {
          const id = await this.createItemService.createItem(
            {
              name: product.name,
              type: 'service',
              code: product.code || undefined,
              costPrice: product.costPrice,
              sellPrice: product.sellPrice,
              // Счета учёта из МойСклад неизвестны — карточка справочная,
              // пользователь дозаполнит их при первом использовании.
              sellable: false,
              purchasable: false,
            } as any,
            trx,
          );
          await this.link(product.externalId, Number(id), trx);
          created += 1;
        }
      }
      return { created, updated, skipped };
    });
  }

  private async fetchProducts(): Promise<MoyskladProduct[]> {
    const token = await this.settings.getToken();
    if (!token) return [];

    const raw = await this.api.list(token, 'product');
    return (raw ?? []).map(mapMoyskladProduct);
  }

  /**
   * Без идентификатора нечего сопоставлять. Имя всегда есть: маппер
   * подставляет «Товар <ид>», если в МойСклад оно пустое.
   */
  private isImportable(product: MoyskladProduct): boolean {
    return Boolean(
      product.externalId &&
        product.externalId !== 'undefined' &&
        product.externalId !== 'null',
    );
  }

  /** Обновление не затирает заполненные поля пустыми значениями из МойСклад. */
  private patchFor(product: MoyskladProduct): Record<string, unknown> {
    const patch: Record<string, unknown> = { name: product.name };
    if (product.code) patch.code = product.code;
    if (product.costPrice) patch.costPrice = product.costPrice;
    if (product.sellPrice) patch.sellPrice = product.sellPrice;
    return patch;
  }

  private async findItemId(
    product: MoyskladProduct,
    trx?: Knex.Transaction,
  ): Promise<number | null> {
    const link = await this.linkModel()
      .query(trx)
      .findOne({ entityType: ENTITY_ITEM, externalId: product.externalId });
    if (link) return link.entityId;

    if (product.code) {
      const byCode = await this.itemModel()
        .query(trx)
        .findOne({ code: product.code });
      if (byCode) return byCode.id;
    }
    return null;
  }

  private async link(
    externalId: string,
    entityId: number,
    trx?: Knex.Transaction,
  ): Promise<void> {
    const existing = await this.linkModel()
      .query(trx)
      .findOne({ entityType: ENTITY_ITEM, externalId });
    if (existing) return;

    await this.linkModel().query(trx).insert({
      entityType: ENTITY_ITEM,
      externalId,
      entityId,
    } as any);
  }
}
