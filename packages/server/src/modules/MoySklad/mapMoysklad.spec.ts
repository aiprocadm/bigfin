import { mapMoyskladProduct, mapMoyskladSale } from './mapMoysklad';

describe('mapMoyskladProduct', () => {
  it('маппит товар, цены из копеек в рубли', () => {
    const raw = {
      id: 'abc-1',
      name: 'Станок',
      code: 'ST-100',
      salePrices: [{ value: 2500050 }],
      buyPrice: { value: 1800000 },
    };
    expect(mapMoyskladProduct(raw)).toEqual({
      externalId: 'abc-1',
      name: 'Станок',
      code: 'ST-100',
      sellPrice: 25000.5,
      costPrice: 18000,
    });
  });

  it('фолбэки: code из article, пустые цены → 0, имя по id', () => {
    const p = mapMoyskladProduct({ id: 'x', article: 'ART-9' });
    expect(p.code).toBe('ART-9');
    expect(p.sellPrice).toBe(0);
    expect(p.costPrice).toBe(0);
    expect(mapMoyskladProduct({ id: 'y' }).name).toBe('Товар y');
  });
});

describe('mapMoyskladSale', () => {
  it('маппит продажу, сумму из копеек, дату', () => {
    const raw = { id: 'd1', name: 'Отгрузка №1', sum: 5000000, moment: '2026-05-31 12:00:00' };
    expect(mapMoyskladSale(raw)).toEqual({
      externalId: 'd1',
      name: 'Отгрузка №1',
      amount: 50000,
      date: '2026-05-31 12:00:00',
    });
  });

  it('фолбэки имени и даты', () => {
    const s = mapMoyskladSale({ id: 'd2' });
    expect(s.name).toBe('Продажа d2');
    expect(s.amount).toBe(0);
    expect(s.date).toBeNull();
  });
});
