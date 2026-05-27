import { Knex } from 'knex';

/**
 * Добавляет nullable-колонки для российских юр.реквизитов в organizations.
 * Все колонки опциональны — существующие записи получают NULL.
 *
 * Sub-project ②a, Task 1 / PR #1.
 * Spec: docs/superpowers/specs/2026-05-27-russian-legal-attributes-design.md
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organizations', (table) => {
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('organizations', (table) => {
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
}
