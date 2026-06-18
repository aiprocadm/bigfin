/**
 * Режим интерфейса организации (business/accountant) — хранится в системной
 * таблице tenants_metadata (одна строка на тенанта). UpdateOrganizationService
 * уже пишет сюда через tenantRepository.saveMetadata({ ...dto }) — нужна
 * только колонка. Пустое значение трактуется как 'business' при чтении.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.string('interface_mode', 20).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.dropColumn('interface_mode');
  });
};
