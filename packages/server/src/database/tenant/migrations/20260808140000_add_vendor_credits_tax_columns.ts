// © 2026 Bigfin
// Д1 «НДС до конца», срез 3: налог на уровне возврата поставщику.
//
// Зеркально кредит-нотам: возврат товара поставщику должен УМЕНЬШАТЬ
// входящий НДС, принятый к вычету. Без налоговых колонок этого не
// происходило — вычет оставался завышенным, а налог к уплате занижался.
//
// Колонки повторяют счета поставщиков (bills) один в один.
exports.up = (knex) =>
  knex.schema.alterTable('vendor_credits', (table) => {
    table.boolean('is_inclusive_tax').defaultTo(false);
    table.decimal('tax_amount_withheld', 13, 2);
  });

exports.down = (knex) =>
  knex.schema.alterTable('vendor_credits', (table) => {
    table.dropColumn('is_inclusive_tax');
    table.dropColumn('tax_amount_withheld');
  });
