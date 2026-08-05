import { isValidOgrnAny } from '../validators/ogrnAny.validator';

/**
 * Одно поле на два вида номера: у юрлица ОГРН (13 цифр), у предпринимателя
 * ОГРНИП (15). Проверка по длине пропускала опечатку в цифре, а такой номер
 * уезжает в счёт и УПД.
 */
describe('ОГРН или ОГРНИП', () => {
  it('принимает настоящий ОГРН юрлица', () => {
    // ОГРН Сбербанка.
    expect(isValidOgrnAny('1027700132195')).toBe(true);
  });

  it('принимает настоящий ОГРНИП предпринимателя', () => {
    expect(isValidOgrnAny('304500116000157')).toBe(true);
  });

  it('ловит опечатку в контрольной цифре ОГРН', () => {
    expect(isValidOgrnAny('1027700132196')).toBe(false);
  });

  it('ловит опечатку в контрольной цифре ОГРНИП', () => {
    expect(isValidOgrnAny('304500116000158')).toBe(false);
  });

  it('не принимает номер неверной длины', () => {
    expect(isValidOgrnAny('999')).toBe(false);
    expect(isValidOgrnAny('10277001321')).toBe(false);
    expect(isValidOgrnAny('10277001321950')).toBe(false);
  });

  it('не принимает буквы и мусор', () => {
    expect(isValidOgrnAny('102770013219X')).toBe(false);
    expect(isValidOgrnAny('')).toBe(false);
    expect(isValidOgrnAny(undefined as any)).toBe(false);
  });
});
