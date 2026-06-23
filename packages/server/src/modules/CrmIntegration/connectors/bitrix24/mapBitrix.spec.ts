import { mapBitrixContact, mapBitrixDeal } from './mapBitrix';

describe('mapBitrixContact', () => {
  it('собирает имя из NAME + LAST_NAME', () => {
    const raw = {
      ID: '42',
      NAME: 'Иван',
      LAST_NAME: 'Петров',
      EMAIL: [{ VALUE: 'ivan@example.ru' }],
      PHONE: [{ VALUE: '+79990001122' }],
      UF_CRM_INN: '7707083893',
    };
    expect(mapBitrixContact(raw)).toEqual({
      externalId: '42',
      displayName: 'Иван Петров',
      inn: '7707083893',
      email: 'ivan@example.ru',
      phone: '+79990001122',
      companyName: null,
    });
  });

  it('для юрлица берёт COMPANY_TITLE как имя и название компании', () => {
    const raw = { ID: 7, COMPANY_TITLE: 'ООО Ромашка' };
    expect(mapBitrixContact(raw)).toEqual({
      externalId: '7',
      displayName: 'ООО Ромашка',
      inn: null,
      email: null,
      phone: null,
      companyName: 'ООО Ромашка',
    });
  });

  it('фолбэк имени, если ни ФИО, ни компании нет', () => {
    expect(mapBitrixContact({ ID: '9' }).displayName).toBe('Контакт 9');
  });

  it('пустые EMAIL/PHONE массивы дают null', () => {
    const c = mapBitrixContact({ ID: '1', NAME: 'А', EMAIL: [], PHONE: [] });
    expect(c.email).toBeNull();
    expect(c.phone).toBeNull();
  });
});

describe('mapBitrixDeal', () => {
  it('маппит сделку с суммой, контактом и датой', () => {
    const raw = {
      ID: '100',
      TITLE: 'Поставка станков',
      OPPORTUNITY: '250000.50',
      CONTACT_ID: '42',
      CLOSEDATE: '2026-05-31T00:00:00+03:00',
    };
    expect(mapBitrixDeal(raw)).toEqual({
      externalId: '100',
      name: 'Поставка станков',
      amount: 250000.5,
      contactExternalId: '42',
      closedAt: '2026-05-31T00:00:00+03:00',
    });
  });

  it('пустая OPPORTUNITY → amount null; нет CONTACT_ID → null', () => {
    const d = mapBitrixDeal({ ID: 5, TITLE: 'Без суммы', OPPORTUNITY: '' });
    expect(d.amount).toBeNull();
    expect(d.contactExternalId).toBeNull();
    expect(d.closedAt).toBeNull();
  });

  it('фолбэк названия сделки', () => {
    expect(mapBitrixDeal({ ID: '8' }).name).toBe('Сделка 8');
  });
});
