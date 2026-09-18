// © 2026 Bigfin
import {
  TOKEN_PREFIX,
  checkToken,
  hashToken,
  issueToken,
  tokenMatches,
} from './apiTokens';

/**
 * Этап 15 ТЗ. Персональные токены публичного API.
 *
 * Токен — ключ от всех денег организации. Всё здесь написано, исходя из
 * того, что база однажды утечёт: в ней не должно лежать ничего, чем можно
 * воспользоваться.
 */

describe('issueToken', () => {
  it('в базу идёт отпечаток, а не сам токен', () => {
    // Утечка базы иначе означала бы утечку доступа ко всем организациям
    // сразу, и отозвать токен человек не успел бы.
    const issued = issueToken();

    expect(issued.hash).not.toContain(issued.token);
    expect(issued.hash).toBe(hashToken(issued.token));
  });

  it('токен узнаётся по префиксу', () => {
    // Префикс позволяет узнать токен в журнале, не раскрывая его.
    expect(issueToken().token.startsWith(TOKEN_PREFIX)).toBe(true);
  });

  it('два токена никогда не совпадают', () => {
    expect(issueToken().token).not.toBe(issueToken().token);
  });

  it('человек может узнать свой токен в списке по хвосту', () => {
    const issued = issueToken();

    expect(issued.lastFour).toHaveLength(4);
    expect(issued.token.endsWith(issued.lastFour)).toBe(true);
  });
});

describe('tokenMatches', () => {
  it('верный токен сходится с отпечатком', () => {
    const issued = issueToken();

    expect(tokenMatches(issued.token, issued.hash)).toBe(true);
  });

  it('чужой токен не проходит', () => {
    const issued = issueToken();

    expect(tokenMatches(issueToken().token, issued.hash)).toBe(false);
  });

  it('мусор вместо отпечатка не роняет проверку', () => {
    // Сравнение разной длины должно вернуть «нет», а не упасть.
    expect(tokenMatches('что-то', 'не-отпечаток')).toBe(false);
    expect(tokenMatches('что-то', '')).toBe(false);
  });
});

describe('checkToken', () => {
  const build = (over: Partial<any> = {}) => {
    const issued = issueToken();
    return {
      token: issued.token,
      stored: { hash: issued.hash, scopes: ['reports:read'], ...over },
    };
  };

  it('действующий токен проходит', () => {
    const { token, stored } = build();

    expect(checkToken(token, stored, 'reports:read')).toBeNull();
  });

  it('неизвестный токен отвергается', () => {
    expect(checkToken('bgf_нет-такого', null)).toBe('unknown');
  });

  it('отозванный токен отвергается', () => {
    const { token, stored } = build({ revokedAt: new Date('2026-01-01') });

    expect(checkToken(token, stored)).toBe('revoked');
  });

  it('истёкший токен отвергается', () => {
    const { token, stored } = build({ expiresAt: '2026-01-01' });

    expect(checkToken(token, stored, undefined, new Date('2026-06-01'))).toBe(
      'expired',
    );
  });

  it('токен, истекающий ровно сейчас, уже недействителен', () => {
    // Граница трактуется в пользу безопасности.
    const moment = new Date('2026-06-01T12:00:00Z');
    const { token, stored } = build({ expiresAt: moment });

    expect(checkToken(token, stored, undefined, moment)).toBe('expired');
  });

  it('токен без срока жизни работает', () => {
    // ТЗ требует «срок жизни», а не «обязательный срок». Навязывать срок
    // значило бы ломать интеграции раз в год без предупреждения.
    const { token, stored } = build({ expiresAt: null });

    expect(checkToken(token, stored, 'reports:read')).toBeNull();
  });

  it('ПУСТОЙ список прав — это не «можно всё»', () => {
    // Токен, у которого забыли проставить права, не должен получать их
    // по умолчанию.
    const { token, stored } = build({ scopes: [] });

    expect(checkToken(token, stored, 'reports:read')).toBe('scope_missing');
  });

  it('нужного права нет — отказ', () => {
    const { token, stored } = build({ scopes: ['reports:read'] });

    expect(checkToken(token, stored, 'transactions:write')).toBe(
      'scope_missing',
    );
  });

  it('отзыв проверяется раньше срока', () => {
    // Отозванный и истёкший — отозванный важнее: так понятнее в журнале.
    const { token, stored } = build({
      revokedAt: new Date('2026-01-01'),
      expiresAt: '2026-01-01',
    });

    expect(checkToken(token, stored, undefined, new Date('2026-06-01'))).toBe(
      'revoked',
    );
  });
});
