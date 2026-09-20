// © 2026 Bigfin
// Составной индекс «направление + дата» на проводках (T-39 ТЗ-2).
//
// ЗАЧЕМ. Блок «Прибыльность направлений» на ГЛАВНОЙ спрашивает обороты
// парой «период + направление»: отбор по дате, группировка по направлению.
// Главная — самый частый экран продукта, и её запросы обязаны быть дешёвыми.
//
// ЗАМЕР (живая база стенда `fin.ptsfera.online`, 20.09.2026).
//
//   SELECT project_id, SUM(credit), SUM(debit)
//     FROM accounts_transactions
//    WHERE date BETWEEN '2026-09-01' AND '2026-09-30'
//    GROUP BY project_id;
//
//   План: type=range, key=accounts_transactions_date_index,
//         Extra = «Using index condition; Using temporary».
//
//   То есть база берёт индекс ДАТЫ, отбирает диапазон и складывает во
//   ВРЕМЕННУЮ ТАБЛИЦУ — потому что группировочная колонка в этом индексе не
//   лежит. На стенде это ничего не стоит: в таблице 59 строк. На объёме, под
//   который писано ТЗ (50 000 операций, отклик до 800 мс), временная таблица
//   на месячный срез — это уже заметно, и растёт она вместе с базой.
//
// ЧЕСТНО О ЗАМЕРЕ: стенд слишком мал, чтобы доказать выигрыш секундами.
// Решение опирается не на его цифры, а на ФОРМУ запроса и на то, что в этой
// же таблице УЖЕ есть два индекса ровно такой формы —
// `accounts_trx_account_id_date_index` и `idx_txn_legal_entity_date`.
// Проект дважды решил, что разрез вместе с датой индексировать стоит;
// направление — третий такой разрез, и выделять его нечем.
//
// ЧЕГО ЗДЕСЬ НЕТ. Индекса `(date, project_id)` — обратного порядка. Отбор
// идёт по дате, а группировка по направлению, и MySQL умеет читать
// группировку из индекса только когда группировочная колонка стоит ПЕРВОЙ.

// ГРАБЛЯ, НАЙДЕННАЯ ПРОГОНОМ `latest → rollback → latest` НА ЖИВОЙ БАЗЕ.
//
// Простой `down()` — «удалить составной индекс» — ПАДАЕТ:
//   ERROR 1553: Cannot drop index … needed in a foreign key constraint
//
// Причина: у колонки `project_id` есть внешний ключ, и база держала для него
// одиночный индекс `accounts_transactions_projectid_foreign`. Как только
// появился составной, начинающийся с той же колонки, база убрала одиночный
// как лишний — и единственной опорой внешнего ключа стал НАШ индекс. Удалить
// его после этого нельзя: ключу не на что опереться.
//
// Поэтому откат сначала ВОЗВРАЩАЕТ одиночный индекс и только потом удаляет
// составной.
//
// Проверено на живой базе стенда в ОБОИХ случаях:
//   • одиночный индекс база убрала сама (так будет на боевой базе, где он
//     создан автоматически под внешний ключ) — откат его возвращает;
//   • одиночный индекс остался на месте (он заведён руками и потому не
//     считается лишним) — откат просто удаляет составной.
// После цикла `up → down → up → down` состояние колонки в точности прежнее.

// Имена уникальны нарочно: миграции — глобальные скрипты без импортов.
const projectDateTable = 'accounts_transactions';
const projectDateIndex = 'accounts_trx_project_id_date_index';
const projectForeignIndex = 'accounts_transactions_projectid_foreign';

/** Есть ли индекс с таким именем — сравнение БЕЗ учёта регистра. */
const hasIndexAnyCase = async (knex, index) => {
  const [rows] = await knex.raw(
    `SELECT COUNT(*) AS count FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND LOWER(table_name) = ?
        AND LOWER(index_name) = ?`,
    [projectDateTable, index],
  );

  return Number(rows[0].count) > 0;
};

exports.up = async (knex) => {
  if (await hasIndexAnyCase(knex, projectDateIndex)) return;

  await knex.schema.alterTable(projectDateTable, (table) => {
    table.index(['project_id', 'date'], projectDateIndex);
  });
};

exports.down = async (knex) => {
  if (!(await hasIndexAnyCase(knex, projectDateIndex))) return;

  // Сначала опора для внешнего ключа, потом удаление составного — иначе
  // база не даст удалить его вовсе.
  if (!(await hasIndexAnyCase(knex, projectForeignIndex))) {
    await knex.schema.alterTable(projectDateTable, (table) => {
      table.index(['project_id'], projectForeignIndex);
    });
  }

  await knex.schema.alterTable(projectDateTable, (table) => {
    table.dropIndex(['project_id', 'date'], projectDateIndex);
  });
};
