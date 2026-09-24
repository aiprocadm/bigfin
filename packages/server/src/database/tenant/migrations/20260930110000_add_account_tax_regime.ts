// © 2026 Bigfin
// FT-070 ТЗ-3 (D15). Налоговый режим у денежного счёта.
//
// ЗАЧЕМ. Предприниматель с ИП на упрощёнке и ООО на общей системе, или с
// самозанятостью на личной карте, держит деньги разных режимов в одной
// организации Bigfin. Оценка налога по одной ставке организации для них
// врёт: оборот карты самозанятого облагается 4–6 %, а не 15 %.
//
// ЧТО В БАЗЕ. Одна строковая колонка, NULLABLE. Пусто — «как у организации»,
// то есть у всех существующих счетов ровно то поведение, что было: оценка
// налога идёт по режиму и ставке из реквизитов организации.
//
// ПОЧЕМУ СТРОКА, А НЕ ENUM И НЕ CHECK. Домен (`ACCOUNT_TAX_REGIMES`) закрыт в
// коде — DTO не пропустит постороннее значение. Проверки домена в MySQL до
// 8.0.16 разбираются и молча игнорируются, а ENUM пришлось бы менять
// миграцией на каждый новый режим.
//
// ПОЧЕМУ information_schema — см. `20260918100100_add_legal_entity_id_columns.ts`:
// схема тенанта в ВЕРХНЕМ регистре, и `hasColumn` на MySQL под Linux
// отвечает «нет» про существующую колонку.

const ACCOUNT_TAX_REGIME_TABLE = 'accounts';
const ACCOUNT_TAX_REGIME_COLUMN = 'tax_regime';

const accountTaxRegimeColumnExists = async (knex, table, column) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(column_name) = ?`,
    [table, column],
  );
  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (
    await accountTaxRegimeColumnExists(
      knex,
      ACCOUNT_TAX_REGIME_TABLE,
      ACCOUNT_TAX_REGIME_COLUMN,
    )
  ) {
    return;
  }
  await knex.schema.alterTable(ACCOUNT_TAX_REGIME_TABLE, (table) => {
    table.string(ACCOUNT_TAX_REGIME_COLUMN, 24).nullable();
  });
};

// Откат теряет только выбранные режимы счетов: оценка налога вернётся к
// ставке организации, ни одна операция и ни один остаток не меняются.
exports.down = async (knex) => {
  if (
    !(await accountTaxRegimeColumnExists(
      knex,
      ACCOUNT_TAX_REGIME_TABLE,
      ACCOUNT_TAX_REGIME_COLUMN,
    ))
  ) {
    return;
  }
  await knex.schema.alterTable(ACCOUNT_TAX_REGIME_TABLE, (table) => {
    table.dropColumn(ACCOUNT_TAX_REGIME_COLUMN);
  });
};
