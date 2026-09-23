// © 2026 Bigfin

/**
 * Человеческий текст отказа при создании денежной операции.
 *
 * Часть проверок отказывает только КОДОМ, без текста. Пакетный ввод
 * (FT-024 ТЗ-3) показывал на такую строку безликое «не удалось сохранить»
 * — человек не понимал, что исправить (найдено живой проверкой этапа 37).
 */
const TEXTS: Record<string, string> = {
  CREDIT_ACCOUNTS_HAS_INVALID_TYPE: 'Статья (счёт) не подходит для этого вида операции',
  CASHFLOW_ACCOUNTS_HAS_INVALID_TYPE: 'Деньги можно провести только по кассе, банковскому счёту или карте',
  CREDIT_ACCOUNTS_IDS_NOT_FOUND: 'Статья (счёт) не найдена',
  CASHFLOW_ACCOUNTS_IDS_NOT_FOUND: 'Счёт денег не найден',
  CASHFLOW_TRANSACTION_TYPE_INVALID: 'Неизвестный вид операции',
  ACCOUNT_ID_HAS_INVALID_TYPE: 'Счёт не подходит для этой операции',
  TRANSACTIONS_DATE_LOCKED: 'Период закрыт — операцию в нём создать нельзя',
  SPLIT_NOT_BALANCED: 'Части не сходятся с суммой операции',
  TRANSACTION_SPLIT_WITHOUT_ARTICLE: 'У каждой части должна быть статья',
  TRANSACTION_SPLIT_ARTICLE_WITHOUT_ACCOUNT: 'У статьи части нет счёта учёта',
  NotFoundError: 'Счёт не найден',
};

export function cashflowErrorText(type: string | null | undefined, message?: string | null): string {
  if (message && message.trim()) return message;
  return (type && TEXTS[type]) || 'Не удалось сохранить операцию';
}
