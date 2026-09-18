// © 2026 Bigfin
import { API_SCOPES, isKnownScope, normalizeScopes } from './apiScopes';

/**
 * Этап 15 ТЗ: токены «с правами и сроком жизни».
 *
 * Главное правило: опечатка в праве не должна выглядеть как выданное право.
 */
describe('normalizeScopes', () => {
  it('опечатка выбрасывается, а не сохраняется', () => {
    // Иначе `reports:raed` осел бы в базе и выглядел как право: в списке
    // он есть, а работать не будет никогда.
    expect(normalizeScopes(['reports:read', 'reports:raed'])).toEqual([
      'reports:read',
    ]);
  });

  it('повторы убираются', () => {
    expect(normalizeScopes(['reports:read', 'reports:read'])).toEqual([
      'reports:read',
    ]);
  });

  it('пробелы по краям не делают право незнакомым', () => {
    expect(normalizeScopes([' reports:read '])).toEqual(['reports:read']);
  });

  it('не список — это пусто, а не «можно всё»', () => {
    expect(normalizeScopes(null)).toEqual([]);
    expect(normalizeScopes('reports:read')).toEqual([]);
    expect(normalizeScopes(undefined)).toEqual([]);
  });

  it('мусор внутри списка не роняет разбор', () => {
    expect(normalizeScopes([null, 42, {}, 'reports:read'])).toEqual([
      'reports:read',
    ]);
  });
});

describe('состав прав', () => {
  it('чтение и запись разделены', () => {
    // Интеграция, которая только забирает отчёты, не должна иметь
    // возможности изменить операцию.
    expect(isKnownScope('transactions:read')).toBe(true);
    expect(isKnownScope('transactions:write')).toBe(true);
  });

  it('нет права «можно всё»', () => {
    // Единственный выключатель «полный доступ» не оставил бы интеграции
    // выбора: либо ничего, либо всё.
    const keys = API_SCOPES.map((scope) => scope.key as string);

    expect(keys).not.toContain('*');
    expect(keys.every((key) => key.includes(':'))).toBe(true);
  });

  it('у каждого права есть человеческое название', () => {
    // В настройках человек выбирает права галочками, и «transactions:write»
    // ему ничего не говорит.
    expect(API_SCOPES.every((scope) => scope.title.length > 0)).toBe(true);
  });
});
