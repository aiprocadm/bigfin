// © 2026 Bigfin
// Д1 «НДС до конца», срез 1: налог на уровне чека.
//
// У чеков (sales_receipts) не было налоговых колонок вовсе, хотя позиции
// документа (items_entries) налог поддерживают для любого типа документа.
// Из-за этого продажи за наличные не попадали в анализ НДС: отчёт показывал
// ноль, как будто продаж не было.
//
// Колонки повторяют счета покупателям (sales_invoices) один в один —
// is_inclusive_tax с тем же значением по умолчанию и tax_amount_withheld
// той же точности, чтобы модели и проводки считались единообразно.
exports.up = (knex) =>
  knex.schema.alterTable('sales_receipts', (table) => {
    table.boolean('is_inclusive_tax').defaultTo(false);
    table.decimal('tax_amount_withheld', 13, 2);
  });

exports.down = (knex) =>
  knex.schema.alterTable('sales_receipts', (table) => {
    table.dropColumn('is_inclusive_tax');
    table.dropColumn('tax_amount_withheld');
  });
