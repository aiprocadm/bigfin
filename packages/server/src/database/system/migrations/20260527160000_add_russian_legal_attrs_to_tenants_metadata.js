/**
 * Российские юридические реквизиты для Organization, хранятся в системной
 * таблице tenants_metadata (одна строка на тенанта). UpdateOrganizationService
 * уже пишет сюда через tenantRepository.saveMetadata({ ...dto }) — нужны
 * только колонки.
 *
 * Замена дефектной миграции add_russian_legal_attrs_to_organizations.ts,
 * которая пыталась alterTable('organizations') в тенант-схеме —
 * такой таблицы в проекте не существует.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.string('legal_form', 20).nullable();
    table.string('tax_regime', 20).nullable();
    table.string('inn', 12).nullable();
    table.string('kpp', 9).nullable();
    table.string('ogrn', 15).nullable();
    table.string('bank_name', 255).nullable();
    table.string('bank_bik', 9).nullable();
    table.string('bank_account', 20).nullable();
    table.string('bank_correspondent_account', 20).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.dropColumn('bank_correspondent_account');
    table.dropColumn('bank_account');
    table.dropColumn('bank_bik');
    table.dropColumn('bank_name');
    table.dropColumn('ogrn');
    table.dropColumn('kpp');
    table.dropColumn('inn');
    table.dropColumn('tax_regime');
    table.dropColumn('legal_form');
  });
};
