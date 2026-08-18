// © 2026 Bigfin
// Составные индексы под горячие запросы отчётов (М3 срез 1, карта v15).
//
// На таблице проводок 15+ индексов и НИ ОДНОГО составного, а спрашивают её
// почти всегда парой «счёт + период»: лента операций счёта, Главная книга,
// Баланс, ОСВ, сальдо по контрагентам. MySQL берёт один индекс и остальное
// отсеивает построчно — на годовом объёме это секунды на каждый отчёт.
//
// У счетов покупателей не проиндексирован срок оплаты, хотя по нему идёт
// отбор в платёжном календаре и дебиторке по срокам — там полный перебор.
//
// Чего здесь намеренно НЕТ (проверено планировщиком на живой базе):
//   • пара (reference_type, reference_id) на проводках — поиск проводок
//     документа планировщик и так делает по существующему индексу номера,
//     он избирателен сам по себе; пара впереди ставит наименее избирательную
//     колонку и выигрыша не даёт, а запись дорожает;
//   • пара на items_entries — там reference_id строковый (varchar), а код
//     сравнивает его с числами: база приводит колонку к числу и индекс не
//     применяет вовсе. Долг записан в карте: сначала сменить тип колонки.

// Имена уникальны нарочно: миграции — глобальные скрипты без импортов.
const hotIdxTransactions = 'accounts_transactions';
const hotIdxInvoices = 'sales_invoices';
const hotIdxAccountDate = 'accounts_trx_account_id_date_index';
const hotIdxInvoiceDueDate = 'sales_invoices_due_date_index';

exports.up = async (knex) => {
  await knex.schema.alterTable(hotIdxTransactions, (table) => {
    table.index(['account_id', 'date'], hotIdxAccountDate);
  });

  await knex.schema.alterTable(hotIdxInvoices, (table) => {
    table.index(['due_date'], hotIdxInvoiceDueDate);
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable(hotIdxInvoices, (table) => {
    table.dropIndex(['due_date'], hotIdxInvoiceDueDate);
  });

  await knex.schema.alterTable(hotIdxTransactions, (table) => {
    table.dropIndex(['account_id', 'date'], hotIdxAccountDate);
  });
};
