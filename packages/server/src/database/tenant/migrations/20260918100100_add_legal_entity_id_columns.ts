// © 2026 Bigfin
// Этап 6 ТЗ, §6.2–6.3 шаг 1. Колонка `legal_entity_id` добавляется NULLABLE
// во все таблицы, где нужен разрез по юрлицу.
//
// Nullable — намеренно и это весь смысл шага 1: на живых организациях строки
// уже есть, и проставить им юрлицо нечем, пока не создан справочник. NOT NULL
// ставит отдельная миграция ПОСЛЕ заполнения (шаг 4 ТЗ).
//
// ВАЖНО ПРО ИМЕНА. ТЗ перечисляет таблицы «по смыслу», и ПЯТЬ имён в схеме
// другие: `sale_invoices` на самом деле `sales_invoices`,
// `sale_estimates` — `sales_estimates`, `dividends` —
// `dividend_payouts`, `payment_calendar_entries` — `planned_operations`,
// `expenses` — `expenses_transactions`. Список ниже — настоящие имена,
// сверенные с моделями; за этим следит `legalEntityColumns.spec.ts`.
//
// Проверка существования — не перестраховка: организации заводились в разное
// время, и модуль, которого у них нет, таблицу не создавал. Падать из-за
// этого вся миграция не должна.
//
// ПОЧЕМУ НЕ `knex.schema.hasTable`. Продукт отображает имена в ВЕРХНИЙ регистр
// (`knexSnakeCaseMappers({ upperCase: true })`): в коде `accounts_transactions`,
// в базе `ACCOUNTS_TRANSACTIONS`. К имени, переданному в `hasTable`, отображение
// НЕ применяется — оно уезжает значением, а не именем. На MySQL под Linux имена
// таблиц чувствительны к регистру, и `hasTable('accounts_transactions')`
// отвечает «нет» про существующую таблицу.
//
// В первой версии этой миграции стоял именно `hasTable`, и она прошла ВЕСЬ
// список из 13 таблиц мимо, записавшись выполненной: ни одной колонки не
// появилось, а журнал миграций утверждал, что всё применено. Ровно тот же
// капкан описан в `20260824100000_add_build_job_to_oneclick_demos.js`.
//
// Помощники ниже намеренно написаны здесь, а не взяты из общего модуля:
// миграция — исторический документ, она обязана работать одинаково через год,
// когда общий модуль переедет или изменится.
// ИМЕНА С ПРИСТАВКОЙ. Миграции — глобальные скрипты без ввозов, и объявления
// верхнего уровня у всех файлов живут в ОДНОМ пространстве имён. Одинаковое
// имя в двух миграциях — ошибка проверки типов. Поэтому у помощников здесь
// приставка по смыслу файла.
const TABLES = [
  // Основное: разрез всех отчётов.
  'accounts_transactions',
  // Счёт принадлежит юрлицу, операции наследуют от счёта.
  'accounts',
  // Документы выставляются от лица юрлица.
  'sales_invoices',
  'bills',
  'sales_estimates',
  'sales_receipts',
  'expenses_transactions',
  'manual_journals',
  // Обязательства и активы принадлежат юрлицу.
  'credits',
  'fixed_assets',
  'dividend_payouts',
  // Планирование ведётся по юрлицу.
  'planned_operations',
  'budgets',
];

exports.TABLES = TABLES;

/** Есть ли таблица — сравнение имени БЕЗ учёта регистра. */
const legalEntityColumnsHasTable = async (knex, table) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?`,
    [String(table).toLowerCase()],
  );
  return Number(rows[0].count) > 0;
};

/** Есть ли колонка — сравнение имён БЕЗ учёта регистра. */
const legalEntityColumnsHasColumn = async (knex, table, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [String(table).toLowerCase(), String(column).toLowerCase()],
  );
  return Number(rows[0].count) > 0;
};

exports.legalEntityColumnsHasTable = legalEntityColumnsHasTable;
exports.legalEntityColumnsHasColumn = legalEntityColumnsHasColumn;

exports.up = async (knex) => {
  for (const tableName of TABLES) {
    const exists = await legalEntityColumnsHasTable(knex, tableName);
    if (!exists) continue;

    // DDL в MySQL необратим: прогон, упавший на середине списка, оставляет
    // уже созданные колонки. Повторный запуск не должен на них спотыкаться.
    const hasColumn = await legalEntityColumnsHasColumn(knex, tableName, 'legal_entity_id');
    if (hasColumn) continue;

    await knex.schema.alterTable(tableName, (table) => {
      const column = table.integer('legal_entity_id').unsigned().nullable();

      // У проводок отчёты всегда спрашивают «юрлицо за период» — составной
      // индекс отвечает на это одним проходом. У остальных разрез идёт
      // без даты, там достаточно одиночного.
      if (tableName === 'accounts_transactions') {
        table.index(['legal_entity_id', 'date'], 'idx_txn_legal_entity_date');
      } else {
        column.index();
      }
    });
  }
};

exports.down = async (knex) => {
  for (const tableName of TABLES) {
    const exists = await legalEntityColumnsHasTable(knex, tableName);
    if (!exists) continue;

    const hasColumn = await legalEntityColumnsHasColumn(knex, tableName, 'legal_entity_id');
    if (!hasColumn) continue;

    await knex.schema.alterTable(tableName, (table) => {
      if (tableName === 'accounts_transactions') {
        table.dropIndex(['legal_entity_id', 'date'], 'idx_txn_legal_entity_date');
      }
      table.dropColumn('legal_entity_id');
    });
  }
};
