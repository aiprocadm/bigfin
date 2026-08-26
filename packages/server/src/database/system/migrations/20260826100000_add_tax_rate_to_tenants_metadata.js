/**
 * Своя ставка налога (Н3б карты v22).
 *
 * Оценка налога на упрощёнке считается по базовой ставке режима: 6 % на
 * «Доходах», 15 % на «Доходах минус расходах», 8 % на АУСН. Но регионы
 * вправе их снижать — до 1 % и до 5 % соответственно, и таких регионов
 * много. Предпринимателю, у которого льготная ставка, оценка по базовой
 * показывала бы сумму в несколько раз больше настоящей.
 *
 * Поле необязательное: пусто = «считать по ставке режима», как раньше.
 * Тип decimal(5,2) — до 999.99 с сотыми: региональные ставки бывают
 * дробными (например, 2,5 %).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.decimal('tax_rate', 5, 2).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table('tenants_metadata', (table) => {
    table.dropColumn('tax_rate');
  });
};
