// © 2026 Bigfin
// Д1 «НДС до конца», срез 2: налог на уровне кредит-ноты.
//
// Возврат от покупателя должен УМЕНЬШАТЬ начисленный НДС, но у кредит-нот
// не было налоговых колонок вовсе: налог возврата никуда не попадал, и
// «НДС к уплате» оставался завышенным даже после того, как товар вернули
// и деньги отдали.
//
// Колонки повторяют счета покупателям и чеки один в один.
exports.up = (knex) =>
  knex.schema.alterTable('credit_notes', (table) => {
    table.boolean('is_inclusive_tax').defaultTo(false);
    table.decimal('tax_amount_withheld', 13, 2);
  });

exports.down = (knex) =>
  knex.schema.alterTable('credit_notes', (table) => {
    table.dropColumn('is_inclusive_tax');
    table.dropColumn('tax_amount_withheld');
  });
