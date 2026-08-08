// © 2026 Bigfin
import { Bill } from './Bill';

/**
 * Итог счёта поставщика с НДС — зеркало счёта покупателю.
 *
 * Отдельная ловушка этой модели: помощник `defaultTo` здесь взят из lodash
 * (значение первым), а в модели счёта покупателю — из ramda (умолчание
 * первым). Перепутанный порядок молча обнуляет итог, поэтому кейс «без
 * налога» и «без скидки» закреплены тестом.
 */
const bill = (over: Record<string, any> = {}): Bill =>
  Object.assign(new Bill(), {
    amount: 50000,
    isInclusiveTax: false,
    exchangeRate: 1,
    ...over,
  });

describe('Bill.total — документ с НДС', () => {
  it('НДС 20% сверху: итог = подытог + налог', () => {
    const doc = bill({ taxAmountWithheld: 10000 });
    expect(doc.subtotal).toBe(50000);
    expect(doc.total).toBe(60000);
    expect(doc.totalLocal).toBe(60000);
  });

  it('НДС в цене: итог = подытог', () => {
    const doc = bill({
      amount: 60000,
      taxAmountWithheld: 10000,
      isInclusiveTax: true,
    });
    expect(doc.total).toBe(60000);
    expect(doc.subtotalExcludingTax).toBe(50000);
  });

  it('без налога: итог равен подытогу', () => {
    const doc = bill({ taxAmountWithheld: null });
    expect(Number.isFinite(doc.total)).toBe(true);
    expect(doc.total).toBe(50000);
  });

  it('без скидки: итог не превращается в «не число»', () => {
    const doc = bill({ discount: undefined, discountType: 'percentage' });
    expect(doc.total).toBe(50000);
  });

  it('корректировка документа больше не отбрасывается', () => {
    const doc = bill({ adjustment: 500 });
    expect(doc.total).toBe(50500);
  });
});
