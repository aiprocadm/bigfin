// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  canRevoke,
  isDeliverySuccessful,
  scopesSummary,
  tokenState,
} from './publicApiView';

const NOW = new Date('2026-09-19T12:00:00Z');

describe('состояние токена', () => {
  it('без отзыва и срока — действует', () => {
    expect(tokenState({ revokedAt: null, expiresAt: null }, NOW)).toBe('active');
  });

  it('срок в будущем — действует', () => {
    expect(
      tokenState({ revokedAt: null, expiresAt: '2027-01-01T00:00:00Z' }, NOW),
    ).toBe('active');
  });

  it('срок в прошлом — срок вышел', () => {
    expect(
      tokenState({ revokedAt: null, expiresAt: '2026-01-01T00:00:00Z' }, NOW),
    ).toBe('expired');
  });

  it('отозванный И просроченный — это ОТОЗВАННЫЙ', () => {
    // Отзыв сделал человек, и он должен видеть своё действие, а не то,
    // что срок заодно вышел.
    expect(
      tokenState(
        { revokedAt: '2026-05-01T00:00:00Z', expiresAt: '2026-01-01T00:00:00Z' },
        NOW,
      ),
    ).toBe('revoked');
  });

  it('испорченная дата срока не делает токен просроченным', () => {
    // Иначе опечатка в данных молча закрыла бы работающую интеграцию.
    expect(
      tokenState({ revokedAt: null, expiresAt: 'не дата' }, NOW),
    ).toBe('active');
  });
});

describe('можно ли отозвать', () => {
  it('действующий — можно', () => {
    expect(canRevoke({ revokedAt: null })).toBe(true);
  });

  it('уже отозванный — нельзя', () => {
    // Кнопка должна быть недоступна, а не молча ничего не делать.
    expect(canRevoke({ revokedAt: '2026-05-01T00:00:00Z' })).toBe(false);
  });
});

describe('права токена одной строкой', () => {
  it('перечисляет права', () => {
    expect(scopesSummary(['reports:read', 'invoices:read'], 'пусто')).toBe(
      'reports:read, invoices:read',
    );
  });

  it('пустой список — это НЕ «можно всё»', () => {
    // Написать «полный доступ» значило бы обмануть ровно в ту сторону,
    // в которую обманывать опаснее всего.
    expect(scopesSummary([], 'прав нет')).toBe('прав нет');
    expect(scopesSummary(undefined, 'прав нет')).toBe('прав нет');
  });
});

describe('удалась ли доставка', () => {
  it('код 200 — удалась', () => {
    expect(isDeliverySuccessful({ responseCode: 200 })).toBe(true);
  });

  it('код 500 — не удалась', () => {
    expect(isDeliverySuccessful({ responseCode: 500 })).toBe(false);
  });

  it('ответа не было вовсе — не удалась', () => {
    expect(isDeliverySuccessful({ responseCode: null })).toBe(false);
  });

  it('перенаправление успехом не считается', () => {
    // Получатель события не получил: 302 означает «ищи в другом месте».
    expect(isDeliverySuccessful({ responseCode: 302 })).toBe(false);
  });
});
