// © 2026 Bigfin
import { Inject, Injectable } from '@nestjs/common';
import * as moment from 'moment';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { ItemEntry } from '@/modules/TransactionItemEntry/models/ItemEntry';
import { InventoryCostLotTracker } from '@/modules/InventoryCost/models/InventoryCostLotTracker';
import { Item } from '@/modules/Items/models/Item';
import {
  computeProductMargins,
  ProductMarginRow,
} from '../utils/financialMath';

export interface ProductMarginItem extends ProductMarginRow {
  name: string;
}

export interface ProductMarginResult {
  products: ProductMarginItem[];
  totals: { revenue: number; cost: number; grossMargin: number };
}

/**
 * Валовая маржа по товару за период = выручка − себестоимость проданного (COGS).
 *
 * Выручка и COGS лежат в разных таблицах и берутся по ОДНОЙ базе —
 * доставленным продажам инвентарных товаров (принцип соответствия):
 *  - выручка: Σ(quantity × rate) строк `items_entries` доставленных счетов-продаж
 *    периода (у самой таблицы строк нет даты, поэтому период — через счета);
 *  - себестоимость: Σ(cost) расходных движений (`direction='OUT'`) лот-трекера
 *    по продажам за период.
 * Сшивка выручки и COGS по `itemId` и сами формулы — в чистой
 * `computeProductMargins` (покрыта unit-тестами).
 */
@Injectable()
export class GetProductMarginService {
  constructor(
    @Inject(SaleInvoice.name)
    private readonly invoiceModel: TenantModelProxy<typeof SaleInvoice>,

    @Inject(ItemEntry.name)
    private readonly itemEntryModel: TenantModelProxy<typeof ItemEntry>,

    @Inject(InventoryCostLotTracker.name)
    private readonly lotTrackerModel: TenantModelProxy<
      typeof InventoryCostLotTracker
    >,

    @Inject(Item.name)
    private readonly itemModel: TenantModelProxy<typeof Item>,
  ) {}

  public async getProductMargin(query: {
    fromDate?: string;
    toDate?: string;
  }): Promise<ProductMarginResult> {
    const fromDate =
      query.fromDate ?? moment().startOf('year').format('YYYY-MM-DD');
    const toDate = query.toDate ?? moment().format('YYYY-MM-DD');

    const revenueByItem = await this.getRevenueByItem(fromDate, toDate);
    const costByItem = await this.getCostByItem(fromDate, toDate);

    const rows = computeProductMargins(revenueByItem, costByItem);
    const products = await this.attachNames(rows);

    const totals = products.reduce(
      (acc, p) => ({
        revenue: acc.revenue + p.revenue,
        cost: acc.cost + p.cost,
        grossMargin: acc.grossMargin + p.grossMargin,
      }),
      { revenue: 0, cost: 0, grossMargin: 0 },
    );

    return { products, totals };
  }

  /** Выручка по товару: строки доставленных счетов-продаж периода (только инвентарные товары). */
  private async getRevenueByItem(
    fromDate: string,
    toDate: string,
  ): Promise<Record<number, number>> {
    const revenueByItem: Record<number, number> = {};

    const invoices = await this.invoiceModel()
      .query()
      .modify('delivered')
      .modify('filterDateRange', fromDate, toDate)
      .select('id');
    const invoiceIds = invoices.map((i: any) => i.id);
    if (invoiceIds.length === 0) return revenueByItem;

    const inventoryItems = await this.itemModel()
      .query()
      .where('type', 'inventory')
      .select('id');
    const inventoryItemIds = inventoryItems.map((it: any) => it.id);
    if (inventoryItemIds.length === 0) return revenueByItem;

    const entries = await this.itemEntryModel()
      .query()
      .where('referenceType', 'SaleInvoice')
      .whereIn('referenceId', invoiceIds)
      .whereIn('itemId', inventoryItemIds)
      .select('itemId', 'quantity', 'rate');

    for (const e of entries as any[]) {
      const amount = Number(e.quantity) * Number(e.rate);
      revenueByItem[e.itemId] = (revenueByItem[e.itemId] ?? 0) + amount;
    }
    return revenueByItem;
  }

  /** Себестоимость (COGS) по товару: расходные движения лот-трекера по продажам за период. */
  private async getCostByItem(
    fromDate: string,
    toDate: string,
  ): Promise<Record<number, number>> {
    const costByItem: Record<number, number> = {};

    const costRows = await this.lotTrackerModel()
      .query()
      .where('transactionType', 'SaleInvoice')
      .where('direction', 'OUT')
      .modify('filterDateRange', fromDate, toDate)
      .select('itemId')
      .sum('cost as cost')
      .groupBy('itemId');

    for (const r of costRows as any[]) {
      costByItem[r.itemId] = Number(r.cost ?? 0);
    }
    return costByItem;
  }

  /** Подставляет имена товаров одним запросом по итоговым id. */
  private async attachNames(
    rows: ProductMarginRow[],
  ): Promise<ProductMarginItem[]> {
    const itemIds = rows.map((r) => r.itemId);
    const items = itemIds.length
      ? await this.itemModel().query().whereIn('id', itemIds).select('id', 'name')
      : [];
    const nameById = new Map<number, string>();
    for (const it of items as any[]) nameById.set(it.id, it.name);

    return rows.map((r) => ({
      ...r,
      name: nameById.get(r.itemId) ?? `#${r.itemId}`,
    }));
  }
}
