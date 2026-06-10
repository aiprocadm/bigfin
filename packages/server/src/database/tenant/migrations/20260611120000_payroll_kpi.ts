// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema
    .alterTable('projects', (table) => {
      // Ответственный менеджер (id из employees). Без FK — зеркалит contact_id,
      // модули остаются слабо связанными (см. спеку ⑧b §2).
      table.integer('manager_id').unsigned().nullable().index();
    })
    .createTable('employee_kpi_targets', (table) => {
      table.increments('id');
      table
        .integer('employee_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('employees')
        .index();
      table.date('period_month').notNullable(); // первое число месяца
      table.string('metric').notNullable().defaultTo('revenue'); // revenue|profit
      table.decimal('target_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('bonus_rate', 8, 4).notNullable().defaultTo(0); // % от факта
      table.boolean('only_if_achieved').notNullable().defaultTo(false);
      table.text('note').nullable();
      table.unique(['employee_id', 'period_month']);
      table.timestamps();
    });

exports.down = (knex) =>
  knex.schema
    .dropTableIfExists('employee_kpi_targets')
    .alterTable('projects', (table) => {
      table.dropIndex('manager_id');
      table.dropColumn('manager_id');
    });
