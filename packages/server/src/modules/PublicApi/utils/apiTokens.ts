// © 2026 Bigfin
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Персональные токены публичного API (этап 15 ТЗ).
 *
 * Токен — это ключ от всех денег организации. Всё в этом файле написано,
 * исходя из того, что база однажды утечёт: в ней не должно лежать ничего,
 * чем можно воспользоваться.
 */

/** Видимый префикс: по нему токен узнаётся в журнале, не раскрывая себя. */
export const TOKEN_PREFIX = 'bgf_';

/** Длина случайной части. 32 байта — это 256 бит, перебор невозможен. */
const TOKEN_BYTES = 32;

export interface IssuedToken {
  /** Показывается человеку ОДИН раз и больше нигде не хранится. */
  token: string;
  /** То, что кладётся в базу. */
  hash: string;
  /** Последние символы — чтобы человек узнал свой токен в списке. */
  lastFour: string;
}

/**
 * Выпускает токен.
 *
 * В базу идёт **только отпечаток**. Хранить сам токен нельзя: утечка базы
 * тогда означала бы утечку доступа ко всем организациям сразу, и отозвать
 * его человек не успел бы.
 */
export function issueToken(): IssuedToken {
  const secret = randomBytes(TOKEN_BYTES).toString('hex');
  const token = `${TOKEN_PREFIX}${secret}`;

  return {
    token,
    hash: hashToken(token),
    lastFour: secret.slice(-4),
  };
}

/** Отпечаток токена. */
export function hashToken(token: string): string {
  return createHash('sha256').update(String(token ?? '')).digest('hex');
}

/**
 * Сверяет предъявленный токен с отпечатком.
 *
 * Сравнение **постоянного времени**: обычное сравнение строк выходит на
 * первом различии, и по времени ответа токен можно подобрать посимвольно.
 */
export function tokenMatches(token: string, storedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(String(storedHash ?? ''), 'hex');

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export interface StoredToken {
  hash: string;
  revokedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  scopes?: string[] | null;
}

export type TokenRejection =
  | 'unknown'
  | 'revoked'
  | 'expired'
  | 'scope_missing'
  | null;

/**
 * Можно ли пользоваться токеном.
 *
 * Порядок проверок выбран так, чтобы ответ не рассказывал лишнего: сначала
 * существование, потом отзыв, потом срок. Но наружу всё равно уходит один
 * общий отказ — различать причины полезно только в журнале.
 *
 * **Токен без срока жизни допустим**, но это осознанный выбор человека:
 * ТЗ требует «срок жизни», а не «обязательный срок». Навязывать срок значило
 * бы ломать интеграции раз в год без предупреждения.
 */
export function checkToken(
  token: string,
  stored: StoredToken | null | undefined,
  requiredScope?: string,
  now: Date = new Date(),
): TokenRejection {
  if (!stored) return 'unknown';
  if (!tokenMatches(token, stored.hash)) return 'unknown';

  if (stored.revokedAt) return 'revoked';

  if (stored.expiresAt && new Date(stored.expiresAt).getTime() <= now.getTime()) {
    return 'expired';
  }

  if (requiredScope) {
    const scopes = stored.scopes ?? [];
    // Пустой список прав — это НЕ «можно всё». Токен, у которого забыли
    // проставить права, не должен получать их по умолчанию.
    if (!scopes.includes(requiredScope)) return 'scope_missing';
  }

  return null;
}
