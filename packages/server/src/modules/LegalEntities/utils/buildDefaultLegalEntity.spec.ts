// © 2026 Bigfin
import {
  FALLBACK_FORM,
  FALLBACK_NAME,
  buildBankDetails,
  buildDefaultLegalEntity,
  deriveLegalForm,
} from './buildDefaultLegalEntity';

/**
 * Этап 6 ТЗ, §6.3 шаг 2. Юрлицо по умолчанию из реквизитов организации.
 *
 * Ошибки такого переноса не падают: они тихо кладут в справочник неверные
 * реквизиты, с которыми потом уходят печатные формы и сверки с контрагентами.
 */

describe('deriveLegalForm — форма ведения дела', () => {
  it('указанную организацией форму берём как есть', () => {
    // Не умничаем поверх того, что человек уже сказал.
    expect(deriveLegalForm('АО', '7701234567')).toBe('АО');
  });

  it('ИНН из 12 цифр — это предприниматель', () => {
    expect(deriveLegalForm(null, '770123456789')).toBe('ИП');
  });

  it('ИНН из 10 цифр — это организация', () => {
    expect(deriveLegalForm(null, '7701234567')).toBe(FALLBACK_FORM);
  });

  it('без ИНН и без формы ставим самую частую и показываем в справочнике', () => {
    expect(deriveLegalForm(null, null)).toBe(FALLBACK_FORM);
  });

  it('пустые строки считаются незаполненными', () => {
    // Пробел в поле формы не должен становиться названием формы.
    expect(deriveLegalForm('   ', '770123456789')).toBe('ИП');
  });
});

describe('buildBankDetails — реквизиты банка', () => {
  it('собирает заполненные поля', () => {
    expect(
      buildBankDetails({
        bankName: 'Сбербанк',
        bankBik: '044525225',
        bankAccount: '40702810000000000001',
        bankCorrespondentAccount: '30101810400000000225',
      }),
    ).toEqual({
      bankName: 'Сбербанк',
      bik: '044525225',
      account: '40702810000000000001',
      correspondentAccount: '30101810400000000225',
    });
  });

  it('пустые поля не попадают', () => {
    expect(buildBankDetails({ bankName: 'Сбербанк', bankBik: '' })).toEqual({
      bankName: 'Сбербанк',
    });
  });

  it('когда не заполнено ничего — null, а не пустой объект', () => {
    // Пустой объект в справочнике читается как «реквизиты есть».
    expect(buildBankDetails({})).toBeNull();
  });
});

describe('buildDefaultLegalEntity', () => {
  it('переносит реквизиты организации', () => {
    const draft = buildDefaultLegalEntity({
      name: 'Ромашка',
      baseCurrency: 'RUB',
      legalForm: 'ООО',
      taxRegime: 'УСН_Д',
      inn: '7701234567',
      kpp: '770101001',
      ogrn: '1027700132195',
      signerDirectorName: 'Иванов И. И.',
    });

    expect(draft).toMatchObject({
      name: 'Ромашка',
      form: 'ООО',
      inn: '7701234567',
      kpp: '770101001',
      ogrn: '1027700132195',
      taxSystem: 'УСН_Д',
      directorName: 'Иванов И. И.',
      baseCurrency: 'RUB',
    });
  });

  it('это головное юрлицо с долей 100%', () => {
    // Пока юрлицо одно, оно принадлежит владельцу целиком, и консолидация
    // не должна урезать его показатели.
    const draft = buildDefaultLegalEntity({ name: 'Ромашка' });

    expect(draft.isPrimary).toBe(true);
    expect(draft.ownershipShare).toBe(100);
    expect(draft.active).toBe(true);
  });

  it('пустые реквизиты становятся пустыми, а не пустыми строками', () => {
    // Пустая строка в ИНН выглядит как «заполнено» и падает потом —
    // на печатной форме или сверке.
    const draft = buildDefaultLegalEntity({
      name: 'Ромашка',
      inn: '',
      kpp: '   ',
      ogrn: undefined,
    });

    expect(draft.inn).toBeNull();
    expect(draft.kpp).toBeNull();
    expect(draft.ogrn).toBeNull();
  });

  it('полное наименование не выдумывается из короткого', () => {
    // Оно ушло бы в печатные формы как официальное.
    expect(buildDefaultLegalEntity({ name: 'Ромашка' }).fullName).toBeNull();
  });

  it('без названия организации ставим понятную заглушку', () => {
    expect(buildDefaultLegalEntity({}).name).toBe(FALLBACK_NAME);
  });

  it('валюта по умолчанию — рубль', () => {
    expect(buildDefaultLegalEntity({ name: 'Ромашка' }).baseCurrency).toBe(
      'RUB',
    );
  });

  it('валюта организации важнее умолчания', () => {
    expect(
      buildDefaultLegalEntity({ name: 'Ромашка', baseCurrency: 'USD' })
        .baseCurrency,
    ).toBe('USD');
  });
});
