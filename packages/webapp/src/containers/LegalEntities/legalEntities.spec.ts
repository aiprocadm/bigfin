// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { getLegalEntitySchema } from './legalEntity.zod';
import {
  canDeleteLegalEntity,
  formatOwnershipShare,
  legalEntityFromForm,
  legalEntityToForm,
  shouldShowLegalEntityBreakdown,
  type LegalEntityRow,
} from './legalEntityView';

const entity = (over: Partial<LegalEntityRow> = {}): LegalEntityRow => ({
  id: 1,
  name: 'ООО Ромашка',
  fullName: 'Общество с ограниченной ответственностью «Ромашка»',
  form: 'ООО',
  inn: '7707083893',
  kpp: '770701001',
  ogrn: '1027700132195',
  taxSystem: 'УСН_Д',
  vatPayer: false,
  baseCurrency: 'RUB',
  directorName: 'Иванов И. И.',
  legalAddress: 'Москва, ул. Тверская, 1',
  actualAddress: null,
  bankDetails: null,
  ownershipShare: 100,
  isPrimary: true,
  active: true,
  accountsCount: 0,
  ...over,
});

const parse = (values: Record<string, unknown>) =>
  getLegalEntitySchema().safeParse(values);

const base = { name: 'ООО Ромашка', form: 'ООО' };

describe('shouldShowLegalEntityBreakdown — раздел не навязывается', () => {
  it('одно юрлицо — разрез не показывается', () => {
    // Человеку с одной фирмой колонка «Юрлицо» только мешает.
    expect(shouldShowLegalEntityBreakdown([entity()])).toBe(false);
  });

  it('два юрлица — разрез появляется', () => {
    expect(
      shouldShowLegalEntityBreakdown([entity(), entity({ id: 2 })]),
    ).toBe(true);
  });

  it('выключенные юрлица не считаются', () => {
    // Выключенное остаётся в базе ради прошлых операций, но навязывать
    // из-за него разрез не за что.
    expect(
      shouldShowLegalEntityBreakdown([
        entity(),
        entity({ id: 2, active: false }),
      ]),
    ).toBe(false);
  });

  it('пустой список не роняет экран', () => {
    expect(shouldShowLegalEntityBreakdown(undefined)).toBe(false);
    expect(shouldShowLegalEntityBreakdown([])).toBe(false);
  });
});

describe('canDeleteLegalEntity — кнопка удаления', () => {
  it('единственное юрлицо удалить нельзя', () => {
    const one = entity();
    expect(canDeleteLegalEntity(one, [one])).toBe(false);
  });

  it('юрлицо со счетами удалить нельзя', () => {
    // Кнопка, которая всегда отвечает отказом, — обещание,
    // которого интерфейс не держит.
    const withAccounts = entity({ id: 2, accountsCount: 3 });
    expect(canDeleteLegalEntity(withAccounts, [entity(), withAccounts])).toBe(
      false,
    );
  });

  it('свободное юрлицо удалить можно', () => {
    const free = entity({ id: 2, accountsCount: 0 });
    expect(canDeleteLegalEntity(free, [entity(), free])).toBe(true);
  });
});

describe('formatOwnershipShare', () => {
  it('целая доля показывается без хвоста нулей', () => {
    expect(formatOwnershipShare(100)).toBe('100%');
  });

  it('дробная доля сохраняет точность', () => {
    expect(formatOwnershipShare(51.5)).toBe('51.5%');
  });
});

describe('форма юрлица — обязательные поля', () => {
  it('без названия сохранить нельзя', () => {
    expect(parse({ ...base, name: '' }).success).toBe(false);
  });

  it('без формы сохранить нельзя', () => {
    expect(parse({ ...base, form: '' }).success).toBe(false);
  });

  it('минимально заполненное юрлицо проходит', () => {
    expect(parse(base).success).toBe(true);
  });
});

describe('форма юрлица — реквизиты', () => {
  it('короткий ИНН отвергается', () => {
    expect(parse({ ...base, inn: '77070838' }).success).toBe(false);
  });

  it('ИНН верной длины, но с опечаткой, отвергается', () => {
    // Длина сходится, а контрольная цифра — нет. Именно такая опечатка
    // уезжает в счёт и УПД.
    expect(parse({ ...base, inn: '7707083894' }).success).toBe(false);
  });

  it('верный ИНН проходит', () => {
    expect(parse({ ...base, inn: '7707083893' }).success).toBe(true);
  });

  it('ошибка ИНН показывается у самого поля', () => {
    const result = parse({ ...base, inn: '123' });
    if (result.success) throw new Error('форма не должна была пройти');
    expect(result.error.issues[0].path).toEqual(['inn']);
  });

  it('пустые реквизиты не мешают сохранить юрлицо', () => {
    // У ИП нет КПП, у самозанятого может не быть ОГРН.
    expect(parse({ ...base, inn: '', kpp: '', ogrn: '' }).success).toBe(true);
  });

  it('неверный ОГРН отвергается', () => {
    expect(parse({ ...base, ogrn: '1027700132196' }).success).toBe(false);
  });
});

describe('форма юрлица — доля владельца', () => {
  it('доля больше 100% отвергается', () => {
    // Владеть больше чем целым нельзя, а консолидация по такой доле
    // завысила бы показатели группы.
    expect(parse({ ...base, ownershipShare: '120' }).success).toBe(false);
  });

  it('отрицательная доля отвергается', () => {
    expect(parse({ ...base, ownershipShare: '-5' }).success).toBe(false);
  });

  it('запятая как разделитель принимается', () => {
    // Русская раскладка на цифровом блоке даёт запятую.
    expect(parse({ ...base, ownershipShare: '51,5' }).success).toBe(true);
  });

  it('по умолчанию доля целая', () => {
    const result = parse(base);
    if (!result.success) throw new Error('форма должна была пройти');
    expect(result.data.ownershipShare).toBe('100');
  });
});

describe('правка юрлица не теряет реквизиты (остаток Ю3)', () => {
  it('в форму переносится всё, что пришло из списка', () => {
    // Форма отправляет на сервер ВСЕ свои поля разом. Поле, которое здесь
    // забыли, уйдёт пустым — и сервер честно затрёт настоящее значение.
    // Так пропадали КПП, ОГРН, директор и адрес при правке названия.
    const values = legalEntityToForm(entity());

    expect(values.kpp).toBe('770701001');
    expect(values.ogrn).toBe('1027700132195');
    expect(values.directorName).toBe('Иванов И. И.');
    expect(values.legalAddress).toBe('Москва, ул. Тверская, 1');
    expect(values.fullName).toContain('Ромашка');
  });

  it('пустые значения приходят пустой строкой, а не словом «null»', () => {
    // Иначе человек увидел бы в поле адреса надпись «null».
    const values = legalEntityToForm(entity({ actualAddress: null }));

    expect(values.actualAddress).toBe('');
  });

  it('банковские реквизиты раскладываются по полям', () => {
    const values = legalEntityToForm(
      entity({
        bankDetails: {
          bankName: 'Сбербанк',
          bik: '044525225',
          account: '40702810100000000001',
        },
      }),
    );

    expect(values.bankName).toBe('Сбербанк');
    expect(values.bik).toBe('044525225');
    expect(values.account).toBe('40702810100000000001');
    // Чего не было — то пустое, а не «undefined».
    expect(values.correspondentAccount).toBe('');
  });

  it('банк собирается обратно в один объект', () => {
    // Сервер хранит реквизиты вместе, и печатные формы читают оттуда же.
    const payload: any = legalEntityFromForm({
      ...legalEntityToForm(entity()),
      bankName: 'Сбербанк',
      bik: '044525225',
    });

    expect(payload.bankDetails).toEqual({
      bankName: 'Сбербанк',
      bik: '044525225',
    });
    expect(payload.bankName).toBeUndefined();
  });

  it('пустые банковские поля не уходят вовсе', () => {
    // Пустая строка в реквизите выглядит как «заполнено» и ломает печатную
    // форму: по такому счёту нельзя заплатить.
    const payload: any = legalEntityFromForm(legalEntityToForm(entity()));

    expect(payload.bankDetails).toBeNull();
  });

  it('доля уходит числом', () => {
    // Запятую с цифрового блока сервер не поймёт.
    const payload: any = legalEntityFromForm({
      ...legalEntityToForm(entity()),
      ownershipShare: '51,5',
    });

    expect(payload.ownershipShare).toBe(51.5);
  });
});
