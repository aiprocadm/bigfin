import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';
import { ManagementArticlesData } from '../data/managementArticles';

export default class SeedManagementArticles extends TenantSeeder {
  /**
   * Seeds the default RU management-article tree to the organization.
   * Parents are inserted first, then children resolve parentId by `key`.
   */
  async up(knex) {
    const now = new Date();
    const keyToId: Record<string, number> = {};

    // Insert roots first, then children (data is ordered roots-before-children).
    for (const article of ManagementArticlesData) {
      const [row] = await knex('management_articles')
        .insert({
          name: article.name,
          parent_id: article.parent ? keyToId[article.parent] : null,
          kind: article.kind,
          cashflow_section: article.cashflow_section,
          sort_order: article.sort_order,
          active: true,
          created_at: now,
          updated_at: now,
        })
        .returning('id');

      keyToId[article.key] = typeof row === 'object' ? row.id : row;
    }
  }
}
