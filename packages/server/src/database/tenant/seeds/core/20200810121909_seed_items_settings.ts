import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';

export default class SeedSettings extends TenantSeeder {
  /**
   * 
   * @param knex 
   * @returns 
   */
  async up(knex) {
    const costAccount = await knex('accounts')
      .where('slug', 'cost-of-goods-sold')
      .first();

    const sellAccount = await knex('accounts')
      .where('slug', 'sales-of-product-income')
      .first();

    const inventoryAccount = await knex('accounts')
      .where('slug', 'inventory-asset')
      .first();

    const settings = [
      // Items settings.
      { group: 'items', key: 'preferred_sell_account', value: sellAccount?.id },
      { group: 'items', key: 'preferred_cost_account', value: costAccount?.id },
      {
        group: 'items',
        key: 'preferred_inventory_account',
        value: inventoryAccount?.id,
      },
      // Настройка с пустым значением бесполезна и молча ломает префил формы
      // товара — если счёта-слага нет, строку не пишем вовсе.
    ].filter((setting) => setting.value !== undefined && setting.value !== null);

    if (settings.length === 0) return;

    return knex('settings').insert(settings);
  }
}
