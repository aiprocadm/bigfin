// © 2026 Bigfin
// Гарантия от дублей импорта банковской выписки на уровне БД (И1 срез 2, v12).
//
// Дедупликация операций держалась только на проверке в коде (findOne по
// external_id перед вставкой). Повтор задачи или гонка двух импортов одного
// файла могли оба пройти проверку и задвоить операцию. Добавляем составной
// UNIQUE (account_id, external_id) — тогда база сама не даст задвоить.
//
// Перед установкой индекса разводим УЖЕ накопленные дубли: оставляем самую
// раннюю запись каждой группы, остальным дописываем суффикс к external_id.
// Так ни одна операция не теряется (принцип «ничего не теряется молча»), а
// индекс встаёт чисто. Операции без external_id (NULL) индексу не мешают —
// MySQL допускает несколько NULL в UNIQUE.

// Имена уникальны нарочно: миграции — глобальные скрипты без импортов.
const uncatExtIdTable = 'uncategorized_cashflow_transactions';
const uncatExtIdUniqueName = 'uncat_cashflow_acc_extid_unique';

exports.up = async (knex) => {
  // 1. Разводим существующие дубли суффиксом #dup<id> (кроме самой ранней).
  await knex.raw(
    `UPDATE ?? AS t
     JOIN (
       SELECT id FROM (
         SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY account_id, external_id ORDER BY id
           ) AS rn
         FROM ??
         WHERE external_id IS NOT NULL
       ) ranked
       WHERE ranked.rn > 1
     ) dups ON dups.id = t.id
     SET t.external_id = CONCAT(t.external_id, '#dup', t.id)`,
    [uncatExtIdTable, uncatExtIdTable],
  );

  // 2. Ставим составной UNIQUE.
  await knex.schema.alterTable(uncatExtIdTable, (table) => {
    table.unique(['account_id', 'external_id'], uncatExtIdUniqueName);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable(uncatExtIdTable, (table) => {
    table.dropUnique(['account_id', 'external_id'], uncatExtIdUniqueName);
  });
};
