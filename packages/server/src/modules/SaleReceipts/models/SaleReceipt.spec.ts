import { SaleReceipt } from './SaleReceipt';
import { DiscountType } from '@/common/types/Discount';

/**
 * Денежные правила чека (㉔). Чек отличается от счёта тем, что оплачен сразу:
 * «оплачено» всегда равно итогу. Скидка и корректировка считаются так же,
 * как в смете и счёте, — здесь это закреплено отдельно, потому что код
 * геттеров у каждого документа свой и расходится незаметно.
 */
const receipt = (fields: Record<string, any>): SaleReceipt =>
  Object.assign(new SaleReceipt(), {
    amount: 0,
    exchangeRate: 1,
    discount: 0,
    adjustment: 0,
    ...fields,
  });

describe('SaleReceipt — скидка', () => {
  it('скидка суммой берётся как есть, процент не заполняется', () => {
    const doc = receipt({
      amount: 10000,
      discount: 1500,
      discountType: DiscountType.Amount,
    });

    expect(doc.discountAmount).toBe(1500);
    expect(doc.discountPercentage).toBeNull();
  });

  it('скидка процентом считается от суммы позиций', () => {
    const doc = receipt({
      amount: 10000,
      discount: 15,
      discountType: DiscountType.Percentage,
    });

    expect(doc.discountAmount).toBe(1500);
    expect(doc.discountPercentage).toBe(15);
  });

  it('скидка в валюте учёта пересчитывается по курсу', () => {
    const doc = receipt({
      amount: 1000,
      discount: 100,
      discountType: DiscountType.Amount,
      exchangeRate: 90,
    });

    expect(doc.discountAmountLocal).toBe(9000);
  });

  it('без скидки в валюте учёта — пусто, а не ноль', () => {
    const doc = receipt({
      amount: 1000,
      discountType: DiscountType.Amount,
      exchangeRate: 90,
    });

    // Ноль скидки и «скидки нет» в отчётах различаются: геттер даёт null.
    expect(doc.discountAmount).toBe(0);
    expect(doc.discountAmountLocal).toBeNull();
  });
});

describe('SaleReceipt — итог', () => {
  it('итог = позиции − скидка + корректировка', () => {
    const doc = receipt({
      amount: 10000,
      discount: 1000,
      discountType: DiscountType.Amount,
      adjustment: 500,
    });

    expect(doc.subtotal).toBe(10000);
    expect(doc.total).toBe(9500);
  });

  it('корректировка вниз уменьшает итог', () => {
    const doc = receipt({
      amount: 10000,
      discountType: DiscountType.Amount,
      adjustment: -300,
    });

    expect(doc.total).toBe(9700);
  });

  it('незаполненная корректировка считается нулём, а не ломает итог', () => {
    const doc = Object.assign(new SaleReceipt(), {
      amount: 10000,
      exchangeRate: 1,
      discount: 0,
      discountType: DiscountType.Amount,
      adjustment: null,
    });

    expect(doc.total).toBe(10000);
  });

  it('чек считается оплаченным на весь итог', () => {
    const doc = receipt({
      amount: 10000,
      discount: 10,
      discountType: DiscountType.Percentage,
    });

    expect(doc.total).toBe(9000);
    expect(doc.paid).toBe(9000);
  });
});

describe('SaleReceipt — валюта учёта', () => {
  it('суммы пересчитываются по курсу', () => {
    const doc = receipt({
      amount: 1000,
      discount: 100,
      discountType: DiscountType.Amount,
      adjustment: 50,
      exchangeRate: 90,
    });

    expect(doc.localAmount).toBe(90000);
    expect(doc.subtotalLocal).toBe(90000);
    expect(doc.totalLocal).toBe(85500); // (1000 − 100 + 50) × 90
    expect(doc.adjustmentLocal).toBe(4500);
    expect(doc.paidLocal).toBe(85500);
  });

  it('при курсе 1 суммы в валюте учёта совпадают с исходными', () => {
    const doc = receipt({
      amount: 2500,
      discountType: DiscountType.Amount,
    });

    expect(doc.totalLocal).toBe(doc.total);
  });
});

describe('SaleReceipt — статус', () => {
  it('чек с датой закрытия закрыт и не черновик', () => {
    const doc = receipt({ amount: 100, closedAt: '2026-08-04' });

    expect(doc.isClosed).toBe(true);
    expect(doc.isDraft).toBe(false);
  });

  it('чек без даты закрытия — черновик', () => {
    const doc = receipt({ amount: 100, closedAt: null });

    expect(doc.isClosed).toBe(false);
    expect(doc.isDraft).toBe(true);
  });
});
