import { TenantSeeder } from '@/libs/migration-seed/TenantSeeder';

/**
 * Имя предопределённого шаблона печати на языке организации (Р4 карты v18).
 *
 * Сами шаблоны создаёт тенантная миграция, а она про организацию ничего не
 * знает — язык живёт в системной базе. Поэтому имя доводим здесь, в сиде: он
 * выполняется сразу после миграций и уже видит `this.tenant`. Русская
 * организация получает «Стандартный шаблон» вместо «Standard Template».
 *
 * Трогаем ТОЛЬКО предопределённые шаблоны с прежним английским именем:
 * шаблон, который пользователь переименовал сам, переименовывать нельзя.
 */
export default class SeedPdfTemplatesName extends TenantSeeder {
  up(knex) {
    const lang = this.tenant?.metadata?.language ?? 'en';
    const templateName = this.i18n.t('pdf.template.standard_name', { lang });

    return knex('pdf_templates')
      .where('predefined', true)
      .where('template_name', 'Standard Template')
      .update({ template_name: templateName });
  }
}
