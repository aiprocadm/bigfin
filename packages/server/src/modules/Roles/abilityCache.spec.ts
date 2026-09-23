// © 2026 Bigfin
import { ABILITIES_CACHE, abilityCacheKey, purgeUserAbilities } from './TenantAbilities';

/**
 * Кеш прав (найдено при подключении токенов API, этап 39 ТЗ-3): ключ —
 * организация + пользователь. Раньше ключом был только номер
 * пользователя, и права владельца одной организации ушли бы в другую.
 */
describe('кеш прав пользователя', () => {
  afterEach(() => ABILITIES_CACHE.reset());

  it('одна и та же персона в двух организациях — два разных ключа', () => {
    expect(abilityCacheKey('org-1', 11)).not.toBe(abilityCacheKey('org-2', 11));
    ABILITIES_CACHE.set(abilityCacheKey('org-1', 11), 'владелец');
    expect(ABILITIES_CACHE.has(abilityCacheKey('org-2', 11))).toBe(false);
  });

  it('правка участника сбрасывает его права во всех организациях, чужие не трогает', () => {
    ABILITIES_CACHE.set(abilityCacheKey('org-1', 11), 'a');
    ABILITIES_CACHE.set(abilityCacheKey('org-2', 11), 'b');
    ABILITIES_CACHE.set(abilityCacheKey('org-1', 111), 'c');
    purgeUserAbilities(11);
    expect(ABILITIES_CACHE.keys()).toEqual([abilityCacheKey('org-1', 111)]);
  });
});
