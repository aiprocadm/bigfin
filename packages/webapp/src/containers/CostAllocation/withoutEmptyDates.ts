// © 2026 Bigfin

/** Поля-сроки правила: оба необязательны. */
const DATE_FIELDS = ['validFrom', 'validTo'] as const;

/**
 * П3 карты v36. Незаполненный срок отправляется как «не задано».
 *
 * Форма хранит пустой срок пустой строкой. Отправленная как есть, она
 * доходила до базы, и MySQL отвечал «Incorrect date value: ''» — правило
 * без сроков не создавалось совсем, а человек видел только «Не удалось
 * сохранить».
 */
export function withoutEmptyDates<T extends Record<string, any>>(values: T): T {
  const result: Record<string, any> = { ...values };

  for (const field of DATE_FIELDS) {
    const value = result[field];
    if (typeof value === 'string' && value.trim() === '') {
      result[field] = null;
    }
  }
  return result as T;
}
