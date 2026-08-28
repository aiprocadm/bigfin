// © 2026 Bigfin
import { describe, it, expect } from 'vitest';
import { withoutEmptyDates } from './withoutEmptyDates';

/**
 * П3 карты v36, находка живой пробы. Правило без сроков не сохранялось.
 *
 * «Действует с» и «Действует по» необязательны, и человек обычно их не
 * заполняет. Форма отправляла пустые строки, MySQL отвечал
 * `ER_TRUNCATED_WRONG_VALUE: Incorrect date value: ''`, приходила ошибка
 * 500. То есть правило без сроков нельзя было создать ВООБЩЕ.
 */
describe('пустые сроки не уходят на сервер', () => {
  it('пустая дата превращается в «не задано»', () => {
    expect(
      withoutEmptyDates({ name: 'Аренда', validFrom: '', validTo: '' }),
    ).toEqual({ name: 'Аренда', validFrom: null, validTo: null });
  });

  it('дата из пробелов тоже считается незаполненной', () => {
    expect(withoutEmptyDates({ validFrom: '   ' })).toEqual({
      validFrom: null,
    });
  });

  it('заполненные сроки остаются как есть', () => {
    expect(
      withoutEmptyDates({ validFrom: '2026-01-01', validTo: '2026-12-31' }),
    ).toEqual({ validFrom: '2026-01-01', validTo: '2026-12-31' });
  });

  it('остальные поля не трогаются', () => {
    const values = {
      name: 'Аренда',
      manualShares: { '1': 3 },
      isActive: true,
      validFrom: '',
    };

    expect(withoutEmptyDates(values)).toEqual({
      name: 'Аренда',
      manualShares: { '1': 3 },
      isActive: true,
      validFrom: null,
    });
  });
});
