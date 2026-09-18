// © 2026 Bigfin
// Этап 7 ТЗ, §7.2. Признак внутригрупповой операции.
//
// Если ООО перевело ИП 500 000 ₽, у группы не появилось ни дохода, ни
// расхода — деньги остались внутри. Без такого признака консолидированный
// ОПиУ завышает и выручку, и расходы сразу.
//
// Признак хранится, а не вычисляется на лету, по двум причинам: ТЗ даёт
// человеку переключатель «Внутригрупповая операция» в ручной операции
// (§7.2 п. 2), и его выбор должен пережить перезагрузку; а отчёты обязаны
// уметь отбирать по признаку одним условием, а не сверкой юрлиц на каждой
// строке.
//
// По умолчанию `false`, а не пусто: пустое значение в отчётах пришлось бы
// трактовать, и каждый отчёт трактовал бы по-своему.
exports.up = async (knex) => {
  const hasColumn = await knex.schema.hasColumn(
    'accounts_transactions',
    'is_intercompany',
  );
  if (hasColumn) return;

  await knex.schema.alterTable('accounts_transactions', (table) => {
    table.boolean('is_intercompany').notNullable().defaultTo(false).index();
  });
};

exports.down = async (knex) => {
  const hasColumn = await knex.schema.hasColumn(
    'accounts_transactions',
    'is_intercompany',
  );
  if (!hasColumn) return;

  await knex.schema.alterTable('accounts_transactions', (table) => {
    table.dropColumn('is_intercompany');
  });
};
