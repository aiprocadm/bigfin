// © 2026 Bigfin
exports.up = (knex) =>
  knex.schema
    .createTable('employees', (table) => {
      table.increments('id');
      table.string('full_name').notNullable();
      table.string('position').nullable();
      table.string('employment_type').notNullable().defaultTo('staff'); // staff|gph|npd|ip
      table.decimal('default_salary', 13, 3).notNullable().defaultTo(0);
      table.boolean('active').notNullable().defaultTo(true).index();
      table.text('note').nullable();
      table.timestamps();
    })
    .createTable('payroll_runs', (table) => {
      table.increments('id');
      table.date('period_month').notNullable().unique(); // первое число месяца
      table.date('pay_date').notNullable();
      table.string('status').notNullable().defaultTo('draft').index(); // draft|approved
      table.text('note').nullable();
      table.timestamps();
    })
    .createTable('payroll_run_lines', (table) => {
      table.increments('id');
      table
        .integer('run_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('payroll_runs')
        .onDelete('CASCADE')
        .index();
      table
        .integer('employee_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('employees')
        .index();
      table.string('employment_type').notNullable(); // снапшот на момент расчёта
      table.decimal('base_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('bonus_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('deduction_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('ndfl_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('contributions_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('net_amount', 13, 3).notNullable().defaultTo(0);
      table.decimal('total_cost', 13, 3).notNullable().defaultTo(0);
      table.unique(['run_id', 'employee_id']);
      table.timestamps();
    });

exports.down = (knex) =>
  knex.schema
    .dropTableIfExists('payroll_run_lines')
    .dropTableIfExists('payroll_runs')
    .dropTableIfExists('employees');
