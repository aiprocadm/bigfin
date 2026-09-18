// © 2026 Bigfin

/**
 * Права токена публичного API (этап 15 ТЗ: «с правами и сроком жизни»).
 *
 * Права разделены на чтение и запись отдельно по каждому разделу, а не одним
 * выключателем «полный доступ». Интеграция, которая только забирает отчёты,
 * не должна иметь возможности изменить операцию — а с единственным
 * выключателем у неё не было бы другого выбора.
 */
export const API_SCOPES = [
  { key: 'reports:read', title: 'Читать отчёты' },
  { key: 'transactions:read', title: 'Читать операции' },
  { key: 'transactions:write', title: 'Создавать и изменять операции' },
  { key: 'contacts:read', title: 'Читать контрагентов' },
  { key: 'contacts:write', title: 'Создавать и изменять контрагентов' },
  { key: 'invoices:read', title: 'Читать счета' },
  { key: 'invoices:write', title: 'Создавать и изменять счета' },
] as const;

export type ApiScope = (typeof API_SCOPES)[number]['key'];

const KNOWN = new Set(API_SCOPES.map((scope) => scope.key as string));

export function isKnownScope(scope: string): scope is ApiScope {
  return KNOWN.has(scope);
}

/**
 * Приводит присланный список прав к порядку.
 *
 * Незнакомые права **выбрасываются**, а не сохраняются «на будущее». Иначе
 * опечатка вроде `reports:raed` тихо осела бы в базе и выглядела как
 * выданное право — в списке она есть, а работать не будет никогда.
 */
export function normalizeScopes(scopes: unknown): ApiScope[] {
  if (!Array.isArray(scopes)) return [];

  const cleaned = scopes
    .map((scope) => String(scope ?? '').trim())
    .filter(isKnownScope);

  // Повторы убираем: список прав — это множество, а не корзина.
  return Array.from(new Set(cleaned));
}
