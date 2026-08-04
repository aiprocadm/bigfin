import { VendorCredit } from './VendorCredit';
import { DiscountType } from '@/common/types/Discount';

/**
 * Возврат поставщику (㉔) — зеркало кредит-ноты: долг поставщика перед нами.
 * Правила те же, но поле зачёта называется иначе (`invoicedAmount` против
 * `invoicesAmount` у кредит-ноты) — ровно на таких почти одинаковых именах
 * ошибка живёт долго и незаметно.
 */
const credit = (fields: Record<string, any>): VendorCredit =>
  Object.assign(new VendorCredit(), {
    amount: 0,
    exchangeRate: 1,
    discount: 0,
    adjustment: 0,
    refundedAmount: 0,
    invoicedAmount: 0,
    ...fields,
  });

describe('VendorCredit — остаток', () => {
  it('остаток = сумма − возвращено деньгами − зачтено в счета поставщика', () => {
    const doc = credit({ amount: 10000, refundedAmount: 2500, invoicedAmount: 1500 });

    expect(doc.creditsRemaining).toBe(6000);
  });

  it('перебор не уводит остаток в минус', () => {
    const doc = credit({ amount: 1000, refundedAmount: 900, invoicedAmount: 400 });

    expect(doc.creditsRemaining).toBe(0);
  });
});

describe('VendorCredit — статус', () => {
  it('без даты открытия — черновик', () => {
    const doc = credit({ amount: 1000, openedAt: null });

    expect(doc.isDraft).toBe(true);
    expect(doc.isPublished).toBe(false);
    expect(doc.isOpen).toBe(false);
  });

  it('открытый возврат с остатком — открыт', () => {
    const doc = credit({ amount: 1000, openedAt: new Date('2026-08-04') });

    expect(doc.isPublished).toBe(true);
    expect(doc.isOpen).toBe(true);
    expect(doc.isClosed).toBe(false);
  });

  it('использованный полностью — закрыт', () => {
    const doc = credit({
      amount: 1000,
      refundedAmount: 1000,
      openedAt: new Date('2026-08-04'),
    });

    expect(doc.isOpen).toBe(false);
    expect(doc.isClosed).toBeTruthy();
  });
});

describe('VendorCredit — скидка, итог и валюта', () => {
  it('скидка процентом считается от суммы позиций', () => {
    const doc = credit({
      amount: 20000,
      discount: 5,
      discountType: DiscountType.Percentage,
    });

    expect(doc.discountAmount).toBe(1000);
    expect(doc.discountPercentage).toBe(5);
  });

  it('скидка суммой не заполняет процент', () => {
    const doc = credit({
      amount: 20000,
      discount: 1000,
      discountType: DiscountType.Amount,
    });

    expect(doc.discountAmount).toBe(1000);
    expect(doc.discountPercentage).toBeNull();
  });

  it('итог = позиции − скидка + корректировка', () => {
    const doc = credit({
      amount: 10000,
      discount: 1000,
      discountType: DiscountType.Amount,
      adjustment: 250,
    });

    expect(doc.subtotal).toBe(10000);
    expect(doc.total).toBe(9250);
  });

  it('суммы пересчитываются по курсу', () => {
    const doc = credit({
      amount: 1000,
      discount: 100,
      discountType: DiscountType.Amount,
      adjustment: 50,
      exchangeRate: 90,
    });

    expect(doc.localAmount).toBe(90000);
    expect(doc.subtotalLocal).toBe(90000);
    expect(doc.discountAmountLocal).toBe(9000);
    expect(doc.adjustmentLocal).toBe(4500);
    expect(doc.totalLocal).toBe(85500);
  });
});
