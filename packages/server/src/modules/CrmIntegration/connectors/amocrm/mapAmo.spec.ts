import { mapAmoContact, mapAmoLead } from './mapAmo';

describe('mapAmoContact', () => {
  it('берёт имя и контакты из custom_fields_values по field_code', () => {
    const raw = {
      id: 55,
      name: 'Иван Петров',
      custom_fields_values: [
        { field_code: 'EMAIL', values: [{ value: 'ivan@example.ru' }] },
        { field_code: 'PHONE', values: [{ value: '+79990001122' }] },
      ],
    };
    expect(mapAmoContact(raw)).toEqual({
      externalId: '55',
      displayName: 'Иван Петров',
      inn: null,
      email: 'ivan@example.ru',
      phone: '+79990001122',
      companyName: null,
    });
  });

  it('нет custom_fields_values → email/phone null', () => {
    const c = mapAmoContact({ id: 7, name: 'ООО Ромашка', custom_fields_values: null });
    expect(c.email).toBeNull();
    expect(c.phone).toBeNull();
    expect(c.displayName).toBe('ООО Ромашка');
  });

  it('фолбэк имени', () => {
    expect(mapAmoContact({ id: 9 }).displayName).toBe('Контакт 9');
  });
});

describe('mapAmoLead', () => {
  it('маппит сделку с ценой, контактом и датой закрытия (unix→ISO)', () => {
    const raw = {
      id: 100,
      name: 'Поставка',
      price: 250000,
      closed_at: 1748649600, // 2025-05-31T00:00:00Z
      _embedded: { contacts: [{ id: 55 }] },
    };
    const d = mapAmoLead(raw);
    expect(d.externalId).toBe('100');
    expect(d.name).toBe('Поставка');
    expect(d.amount).toBe(250000);
    expect(d.contactExternalId).toBe('55');
    expect(d.closedAt).toBe('2025-05-31T00:00:00.000Z');
  });

  it('нет цены/контакта/даты → null', () => {
    const d = mapAmoLead({ id: 5, name: 'Услуга' });
    expect(d.amount).toBeNull();
    expect(d.contactExternalId).toBeNull();
    expect(d.closedAt).toBeNull();
  });

  it('фолбэк названия', () => {
    expect(mapAmoLead({ id: 8 }).name).toBe('Сделка 8');
  });
});
