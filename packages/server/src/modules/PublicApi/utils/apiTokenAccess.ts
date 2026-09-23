// © 2026 Bigfin
import { TokenRejection } from './apiTokens';

/**
 * Решение по запросу с токеном API (FT-091 ТЗ-3). Без базы — его держат
 * тесты.
 *
 * Коды отказа разные НАМЕРЕННО и ровно настолько, насколько нужно
 * интегратору: «токена нет» — 401 (войдите), «токен был, но больше не
 * действует» и «не хватает права» — 403 (вход есть, доступа нет). Текст
 * отказа не говорит, существовал ли подобранный токен.
 */
export type ApiTokenDecision =
  | { allow: true }
  | { allow: false; status: 401 | 403; type: string; message: string };

export function apiTokenDecision(input: {
  rejection: TokenRejection;
  hasOwner: boolean;
  requiredScope: string | undefined;
  scopes: string[];
  organizationMatches: boolean;
}): ApiTokenDecision {
  if (input.rejection === 'unknown') {
    return { allow: false, status: 401, type: 'API_TOKEN_INVALID', message: 'Токен API не принят' };
  }
  if (input.rejection === 'revoked' || input.rejection === 'expired') {
    return { allow: false, status: 403, type: 'API_TOKEN_INACTIVE', message: 'Токен API отозван или истёк' };
  }
  if (!input.hasOwner) {
    return { allow: false, status: 403, type: 'API_TOKEN_NO_OWNER', message: 'У токена API нет владельца — выпустите новый' };
  }
  if (!input.organizationMatches) {
    return {
      allow: false,
      status: 403,
      type: 'API_TOKEN_ORGANIZATION_MISMATCH',
      message: 'Токен API выпущен для другой организации',
    };
  }
  if (!input.requiredScope) {
    return {
      allow: false,
      status: 403,
      type: 'API_SCOPE_NOT_AVAILABLE',
      message: 'Эта ручка недоступна по токену API',
    };
  }
  if (!input.scopes.includes(input.requiredScope)) {
    return {
      allow: false,
      status: 403,
      type: 'API_SCOPE_MISSING',
      message: `У токена нет права «${input.requiredScope}»`,
    };
  }
  return { allow: true };
}
