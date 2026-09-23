// © 2026 Bigfin
import { apiTokenDecision } from './apiTokenAccess';

/** FT-091 ТЗ-3: решения по запросу с токеном API. */
describe('вход по токену API', () => {
  const base = {
    rejection: null,
    hasOwner: true,
    requiredScope: 'reports:read',
    scopes: ['reports:read'],
    organizationMatches: true,
  } as const;

  it('AC 1: валидный токен с reports:read получает отчёт', () => {
    expect(apiTokenDecision({ ...base, scopes: [...base.scopes] })).toEqual({ allow: true });
  });

  it('AC 2: без нужного права — 403 с единым телом и понятным текстом', () => {
    expect(apiTokenDecision({ ...base, scopes: ['transactions:read'] })).toEqual({
      allow: false,
      status: 403,
      type: 'API_SCOPE_MISSING',
      message: 'У токена нет права «reports:read»',
    });
  });

  it('AC 3: отозванный или истёкший — 403; неизвестный — 401', () => {
    expect(apiTokenDecision({ ...base, scopes: [...base.scopes], rejection: 'revoked' })).toMatchObject({ status: 403, type: 'API_TOKEN_INACTIVE' });
    expect(apiTokenDecision({ ...base, scopes: [...base.scopes], rejection: 'expired' })).toMatchObject({ status: 403 });
    expect(apiTokenDecision({ ...base, scopes: [...base.scopes], rejection: 'unknown' })).toMatchObject({ status: 401 });
  });

  it('ручка без метки права по токену закрыта — запрет по умолчанию', () => {
    expect(apiTokenDecision({ ...base, scopes: [...base.scopes], requiredScope: undefined })).toMatchObject({
      status: 403,
      type: 'API_SCOPE_NOT_AVAILABLE',
    });
  });

  it('чужая организация в заголовке и токен без владельца — отказ', () => {
    expect(apiTokenDecision({ ...base, scopes: [...base.scopes], organizationMatches: false })).toMatchObject({ status: 403 });
    expect(apiTokenDecision({ ...base, scopes: [...base.scopes], hasOwner: false })).toMatchObject({ status: 403 });
  });
});
