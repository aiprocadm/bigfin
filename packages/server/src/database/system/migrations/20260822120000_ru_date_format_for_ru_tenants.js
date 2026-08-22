/**
 * Русская дата с точками (Р2 карты v18): существующим русскоязычным
 * организациям, сидящим на дефолтных/слэшевых форматах, ставится
 * «DD.MM.YYYY» — иначе выбор «28.07.2026» появился бы только у новых.
 *
 * Сознательно выбранные экзотические форматы (MM/DD…, словесные с большой
 * буквы и т. п.) не трогаются — правим только прежний дефолт и его
 * слэш-варианты того же порядка Д-М-Г.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex('tenants_metadata')
    .where('language', 'ru')
    .where((builder) =>
      builder
        .whereNull('date_format')
        .orWhereIn('date_format', ['', 'DD MMM YYYY', 'DD/MM/yyyy', 'DD/MM/YY']),
    )
    .update({ date_format: 'DD.MM.YYYY' });
};

/**
 * Откат: вернуть прежний дефолт. Какая именно из исходных строк была у
 * конкретной организации — неизвестно, поэтому все получают старый дефолт.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex('tenants_metadata')
    .where('language', 'ru')
    .where('date_format', 'DD.MM.YYYY')
    .update({ date_format: 'DD MMM YYYY' });
};
