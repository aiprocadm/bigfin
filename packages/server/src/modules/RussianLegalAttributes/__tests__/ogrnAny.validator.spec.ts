import {
  isValidOgrnAny,
  OgrnAnyConstraint,
} from '../validators/ogrnAny.validator';

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

/**
 * Р2 срез 1 (карта v16). У ИНН, КПП, БИК и обоих счетов проверка считает
 * пустое значение «полем не заполнили» и пропускает его. У ОГРН этой строки
 * не было — единственный из шести. Как только реквизиты появились в форме
 * (а форма шлёт все поля разом), пустой ОГРН отвечал 400 и вместе с ним
 * переставал сохраняться ВЕСЬ экран «Общие», включая название организации.
 */
describe('OgrnAnyConstraint — незаполненное поле', () => {
  const constraint = new OgrnAnyConstraint();

  it('пропускает пусто, null и undefined', () => {
    expect(constraint.validate('')).toBe(true);
    expect(constraint.validate(null)).toBe(true);
    expect(constraint.validate(undefined)).toBe(true);
  });

  it('заполненный номер по-прежнему проверяет', () => {
    expect(constraint.validate('1027700132195')).toBe(true);
    expect(constraint.validate('1027700132196')).toBe(false);
  });
});
