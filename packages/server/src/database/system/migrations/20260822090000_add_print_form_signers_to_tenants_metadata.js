/**
 * Подписанты печатных форм (вопрос 33 карты v17): ФИО и должность
 * руководителя и ФИО главбуха. Хранятся в системной таблице
 * tenants_metadata рядом с остальными реквизитами организации —
 * UpdateOrganizationService пишет их через saveMetadata, как ИНН/КПП.
 *
 * Все поля необязательны: пустое ФИО оставляет линию подписи в печатной
 * форме пустой, как раньше.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.string('signer_director_name', 255).nullable();
    table.string('signer_director_position', 255).nullable();
    table.string('signer_accountant_name', 255).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.dropColumn('signer_accountant_name');
    table.dropColumn('signer_director_position');
    table.dropColumn('signer_director_name');
  });
};
