import { mapInboundCrmPayload } from './mapInbound';

describe('mapInboundCrmPayload', () => {
  it('разбирает контакт', () => {
    const r = mapInboundCrmPayload({
      type: 'contact',
      externalId: 'c1',
      displayName: 'ООО Ромашка',
      inn: '7707083893',
    });
    expect(r.contact).toEqual({
      externalId: 'c1',
      displayName: 'ООО Ромашка',
      inn: '7707083893',
      email: null,
      phone: null,
      companyName: null,
    });
    expect(r.deal).toBeUndefined();
  });

  it('разбирает сделку с числовой суммой и контактом', () => {
    const r = mapInboundCrmPayload({
      type: 'deal',
      externalId: 100,
      name: 'Поставка',
      amount: 250000,
      contactExternalId: 'c1',
      closedAt: '2026-05-31',
    });
    expect(r.deal).toEqual({
      externalId: '100',
      name: 'Поставка',
      amount: 250000,
      contactExternalId: 'c1',
      closedAt: '2026-05-31',
    });
  });

  it('фолбэки имён и null-поля', () => {
    const r = mapInboundCrmPayload({ type: 'deal', externalId: 8 });
    expect(r.deal?.name).toBe('Сделка 8');
    expect(r.deal?.amount).toBeNull();
    expect(r.deal?.contactExternalId).toBeNull();
  });

  it('неизвестный тип → ошибка', () => {
    expect(() => mapInboundCrmPayload({ type: 'lead' })).toThrow();
    expect(() => mapInboundCrmPayload({})).toThrow();
  });

  it('отсутствует externalId → ошибка (защита от схлопывания дедупа)', () => {
    expect(() => mapInboundCrmPayload({ type: 'contact' })).toThrow();
    expect(() => mapInboundCrmPayload({ type: 'deal', externalId: '' })).toThrow();
  });
});
