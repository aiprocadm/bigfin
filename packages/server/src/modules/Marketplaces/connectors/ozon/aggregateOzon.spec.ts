import { aggregateOzonOperations } from './aggregateOzon';

/** Операция Ozon: начисление за продажу с комиссией и услугами. */
const sale = (over: Record<string, any> = {}) => ({
  operation_type: 'OperationAgentDeliveredToCustomer',
  accruals_for_sale: 1000,
  sale_commission: -150,
  delivery_charge: -50,
  return_delivery_charge: 0,
  amount: 800,
  services: [],
  ...over,
});

describe('aggregateOzonOperations', () => {
  it('складывает выручку и к перечислению по всем операциям', () => {
    const summary = aggregateOzonOperations([
      sale(),
      sale({ accruals_for_sale: 500, amount: 400 }),
    ]);

    expect(summary.revenue).toBe(1500);
    expect(summary.toPay).toBe(1200);
    // Удержания — разница между выручкой и тем, что дойдёт до продавца.
    expect(summary.deductions).toBe(300);
  });

  it('логистика — доставка и возвратная доставка по модулю', () => {
    const summary = aggregateOzonOperations([
      sale({ delivery_charge: -50, return_delivery_charge: -30 }),
    ]);

    expect(summary.logistics).toBe(80);
  });

  it('услуги разносит на хранение, логистику и штрафы по названию', () => {
    const summary = aggregateOzonOperations([
      sale({
        services: [
          { name: 'MarketplaceServiceItemStorage', price: -25 },
          { name: 'MarketplaceServiceItemDelivToCustomer', price: -70 },
          { name: 'MarketplaceServiceItemFine', price: -300 },
        ],
      }),
    ]);

    expect(summary.storage).toBe(25);
    // 50 из delivery_charge + 70 из услуги доставки.
    expect(summary.logistics).toBe(120);
    expect(summary.penalties).toBe(300);
  });

  it('операции возврата уменьшают выручку', () => {
    const summary = aggregateOzonOperations([
      sale(),
      sale({
        operation_type: 'ClientReturnAgentOperation',
        accruals_for_sale: -1000,
        sale_commission: 150,
        amount: -800,
      }),
    ]);

    expect(summary.revenue).toBe(0);
    expect(summary.toPay).toBe(0);
  });

  it('пустой список и битые значения дают нули, а не NaN', () => {
    expect(aggregateOzonOperations([])).toEqual({
      revenue: 0,
      toPay: 0,
      deductions: 0,
      logistics: 0,
      penalties: 0,
      storage: 0,
    });

    const broken = aggregateOzonOperations([
      { accruals_for_sale: 'нет', amount: null, services: null } as any,
    ]);
    expect(Object.values(broken).every((v) => v === 0)).toBe(true);
  });

  it('неизвестная услуга попадает в удержания, но не в отдельные статьи', () => {
    const summary = aggregateOzonOperations([
      sale({
        services: [{ name: 'MarketplaceServiceItemSomethingNew', price: -10 }],
      }),
    ]);

    expect(summary.storage).toBe(0);
    expect(summary.penalties).toBe(0);
    // Общая картина «выручка − к перечислению» не зависит от разбора услуг.
    expect(summary.deductions).toBe(200);
  });
});
