// © 2026 Bigfin

/**
 * Таблицы, в которых есть колонка `legal_entity_id` (этап 6 ТЗ, §6.2).
 *
 * Список ОБЯЗАН совпадать с тем, что перечислен в миграции
 * `20260918100100_add_legal_entity_id_columns.ts`. За совпадением следит
 * `backfillTables.spec.ts`: таблица, которой нет здесь, никогда не будет
 * заполнена — колонка останется пустой, и разрез по юрлицу в ней промолчит,
 * ровно как при опечатке в имени.
 *
 * Имена — НАСТОЯЩИЕ из схемы, а не «по смыслу» из ТЗ (пять из них в ТЗ
 * записаны иначе).
 */
export const LEGAL_ENTITY_TABLES = [
  'accounts_transactions',
  'accounts',
  'sales_invoices',
  'bills',
  'sales_estimates',
  'sales_receipts',
  'expenses_transactions',
  'manual_journals',
  'credits',
  'fixed_assets',
  'dividend_payouts',
  'planned_operations',
  'budgets',
];

/**
 * Размер пакета заполнения — из ТЗ §6.3 шаг 3.
 *
 * Одним запросом на всю таблицу обновлять нельзя: у живой организации в
 * проводках сотни тысяч строк, и такой UPDATE держит блокировку так долго,
 * что продукт на это время встаёт.
 */
export const BACKFILL_BATCH_SIZE = 10_000;

/**
 * Потолок пакетов за один запуск задачи.
 *
 * Не ограничение объёма, а страховка от вечного цикла: если условие отбора
 * однажды перестанет сужать выборку, задача не будет крутиться бесконечно,
 * а завершится и оставит след в журнале.
 */
export const BACKFILL_MAX_BATCHES = 1_000;

/** Очередь заполнения юрлица. */
export const BackfillLegalEntityQueue = 'backfill-legal-entity';

export interface BackfillLegalEntityJobPayload {
  organizationId: string;
  userId?: number;
}
