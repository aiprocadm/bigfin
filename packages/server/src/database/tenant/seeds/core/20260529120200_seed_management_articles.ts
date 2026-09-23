import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';
import { AllManagementArticlesData } from '../data/managementArticles';

export default class SeedManagementArticles extends TenantSeeder {
  /**
   * Заводит организации дерево статей учёта: доходы, расходы и балансовые
   * виды (этап 17 ТЗ-2). Родители идут раньше детей — список так и упорядочен.
   *
   * ВСТАВКА ТОЛЬКО НЕДОСТАЮЩИХ, по устойчивому ключу `seed_key`.
   *
   * ЗАЧЕМ, ЕСЛИ СИД И ТАК ГОНЯЕТСЯ ОДИН РАЗ. Балансовые статьи добавляет ещё
   * и догоняющая миграция — для организаций, заведённых до пяти видов. У
   * новой организации порядок «сначала миграции, потом сиды», и без проверки
   * сид создал бы вторые «Активы», «Обязательства» и «Капитал». Дубль в
   * справочнике статей тихий и неприятный: половина операций размечена одной
   * статьёй, половина — её близнецом, и отчёт разъезжается на две строки.
   *
   * Проверка по КЛЮЧУ, а не по имени: имя системной статьи разрешено менять.
   */
  async up(knex) {
    const now = new Date();
    const keyToId: Record<string, number> = {};

    for (const article of AllManagementArticlesData) {
      const existing = await knex('management_articles')
        .where('seed_key', article.key)
        .first('id');

      if (existing) {
        keyToId[article.key] = existing.id ?? existing.ID;
        continue;
      }

      const [row] = await knex('management_articles')
        .insert({
          name: article.name,
          parent_id: article.parent ? keyToId[article.parent] : null,
          kind: article.kind,
          cashflow_section: article.cashflow_section,
          sort_order: article.sort_order,
          // Ярус управленческого ОПиУ (FT-009 ТЗ-3). У балансовых статей его
          // нет и быть не может — там `null`.
          pl_type: (article as { pl_type?: string }).pl_type ?? null,
          seed_key: article.key,
          active: true,
          created_at: now,
          updated_at: now,
        })
        .returning('id');

      keyToId[article.key] = typeof row === 'object' ? row.id : row;
    }
  }
}
