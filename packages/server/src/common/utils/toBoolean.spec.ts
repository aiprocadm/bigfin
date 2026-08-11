// © 2026 Bigfin
import { toBoolean } from './toBoolean';

/**
 * Настройки хранятся строками. Модуль, который включали, а потом выключили,
 * возвращался как строка «0» — а непустая строка в JavaScript истинна.
 * Из-за этого любая проверка «модуль включён?» пропускала запрос: выключенный
 * модуль продолжал отвечать. Ни разу не тронутый модуль при этом работал
 * правильно, потому что отдавал настоящее `false` из умолчаний, — поэтому
 * дефект и прятался.
 */
describe('toBoolean — признак «включено» из настроек', () => {
  it('строка «0» — это выключено', () => {
    expect(toBoolean('0')).toBe(false);
  });

  it('строка «false» — тоже выключено', () => {
    expect(toBoolean('false')).toBe(false);
    expect(toBoolean('False')).toBe(false);
  });

  it('пустая строка — выключено', () => {
    expect(toBoolean('')).toBe(false);
    expect(toBoolean('   ')).toBe(false);
  });

  it('строка «1» и «true» — включено', () => {
    expect(toBoolean('1')).toBe(true);
    expect(toBoolean('true')).toBe(true);
  });

  it('настоящие логические значения не меняются', () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean(false)).toBe(false);
  });

  it('пусто и ноль — выключено', () => {
    expect(toBoolean(null)).toBe(false);
    expect(toBoolean(undefined)).toBe(false);
    expect(toBoolean(0)).toBe(false);
  });

  it('единица — включено', () => {
    expect(toBoolean(1)).toBe(true);
  });
});
