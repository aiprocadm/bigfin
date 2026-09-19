// © 2026 Bigfin
/**
 * Правила показа раздела «Публичный API» (этап 15 ТЗ).
 *
 * Здесь решается одно: как назвать состояние токена и доставки так, чтобы
 * человек понял его без документации.
 */

export interface ApiTokenRow {
  id: number;
  name: string;
  lastFour: string;
  scopes: string[];
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
}

export type TokenState = 'revoked' | 'expired' | 'active';

/**
 * Состояние токена.
 *
 * Порядок проверок важен: отозванный и просроченный одновременно — это
 * ОТОЗВАННЫЙ. Отзыв сделал человек, и он должен видеть именно своё действие,
 * а не то, что срок заодно вышел.
 */
export function tokenState(
  token: Pick<ApiTokenRow, 'revokedAt' | 'expiresAt'>,
  now: Date = new Date(),
): TokenState {
  if (token.revokedAt) return 'revoked';

  if (token.expiresAt) {
    const expires = new Date(token.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) {
      return 'expired';
    }
  }

  return 'active';
}

/**
 * Можно ли отозвать токен.
 *
 * Отозванный отзывать нечего — кнопка должна быть недоступна, а не молча
 * ничего не делать. Просроченный отозвать МОЖНО: срок мог быть продлён
 * ошибкой, и человек вправе закрыть доступ наверняка.
 */
export function canRevoke(token: Pick<ApiTokenRow, 'revokedAt'>): boolean {
  return !token.revokedAt;
}

/**
 * Права токена одной строкой.
 *
 * Пустой список — это НЕ «можно всё». Такой токен не пройдёт ни одной
 * проверки права, и написать про него «полный доступ» значило бы обмануть
 * ровно в ту сторону, в которую обманывать опаснее всего.
 */
export function scopesSummary(
  scopes: string[] | undefined,
  emptyLabel: string,
): string {
  if (!scopes || scopes.length === 0) return emptyLabel;

  return scopes.join(', ');
}

export interface WebhookDeliveryRow {
  status: string;
  responseCode: number | null;
  error: string | null;
}

/**
 * Удалась ли доставка.
 *
 * Считаем по коду ответа, а не по слову «успех» из базы: код — это то, что
 * и правда вернул получатель.
 */
export function isDeliverySuccessful(
  delivery: Pick<WebhookDeliveryRow, 'responseCode'>,
): boolean {
  const code = Number(delivery.responseCode);

  return Number.isFinite(code) && code >= 200 && code < 300;
}
