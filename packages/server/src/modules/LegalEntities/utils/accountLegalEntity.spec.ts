// © 2026 Bigfin
import {
  canChangeAccountLegalEntity,
  decideAccountLegalEntity,
} from './accountLegalEntity';

/**
 * Этап 8 ТЗ, §8.1. Юрлицо у счёта.
 *
 * ТЗ требует «обязательный выбор юрлица», но приёмка того же блока (§8.5)
 * требует, чтобы организация с одним юрлицом не видела НИКАКИХ изменений.
 * Буквальное прочтение первого ломает второе: выбор из одного варианта —
 * это и есть изменение, причём бессмысленное.
 */
const entity = (id: number, over: Partial<any> = {}) => ({
  id,
  active: true,
  isPrimary: id === 1,
  ...over,
});

describe('decideAccountLegalEntity', () => {
  it('одно юрлицо — подставляется само, спрашивать нечего', () => {
    expect(decideAccountLegalEntity(null, [entity(1)])).toEqual({
      legalEntityId: 1,
      mustAsk: false,
    });
  });

  it('несколько юрлиц без выбора — спрашиваем', () => {
    // Угадывать нельзя: ошибка разводит остатки по юрлицам,
    // и заметят её через месяц.
    expect(decideAccountLegalEntity(null, [entity(1), entity(2)])).toEqual({
      legalEntityId: null,
      mustAsk: true,
    });
  });

  it('явный выбор уважается всегда', () => {
    expect(decideAccountLegalEntity(2, [entity(1), entity(2)])).toEqual({
      legalEntityId: 2,
      mustAsk: false,
    });
  });

  it('выключенные юрлица не считаются', () => {
    // Выключенное остаётся ради прошлых операций, но выбирать из него
    // человеку не предлагают.
    expect(
      decideAccountLegalEntity(null, [
        entity(1),
        entity(2, { active: false }),
      ]),
    ).toEqual({ legalEntityId: 1, mustAsk: false });
  });

  it('справочника нет вовсе — ведём себя как раньше', () => {
    // Старая база до этапа 6: счёт заводится без юрлица и не падает.
    expect(decideAccountLegalEntity(null, [])).toEqual({
      legalEntityId: null,
      mustAsk: false,
    });
    expect(decideAccountLegalEntity(null, undefined)).toEqual({
      legalEntityId: null,
      mustAsk: false,
    });
  });
});

describe('canChangeAccountLegalEntity', () => {
  it('у пустого счёта юрлицо менять можно', () => {
    expect(canChangeAccountLegalEntity(0)).toBe(true);
  });

  it('у счёта с операциями — нельзя', () => {
    // Операции наследовали юрлицо от счёта. Смена задним числом разведёт
    // остатки: часть операций окажется у одного юрлица, часть у другого.
    expect(canChangeAccountLegalEntity(1)).toBe(false);
    expect(canChangeAccountLegalEntity(10_000)).toBe(false);
  });

  it('неизвестное число операций считается «есть»', () => {
    // Безопасная сторона: запретить смену дешевле, чем потом сводить
    // разъехавшиеся остатки.
    expect(canChangeAccountLegalEntity(undefined)).toBe(false);
    expect(canChangeAccountLegalEntity(null)).toBe(false);
    expect(canChangeAccountLegalEntity(NaN)).toBe(false);
  });
});
