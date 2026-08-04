import { CreditNote } from './CreditNote';
import { DiscountType } from '@/common/types/Discount';

/**
 * Кредит-нота (㉔) — «долг перед покупателем»: её сумму либо возвращают
 * деньгами, либо зачитывают в счета. Главное денежное правило — остаток
 * кредита: он не должен уходить в минус и обязан обнуляться ровно тогда,
 * когда нота полностью использована.
 */
const note = (fields: Record<string, any>): CreditNote =>
  Object.assign(new CreditNote(), {
    amount: 0,
    exchangeRate: 1,
    discount: 0,
    adjustment: 0,
    refundedAmount: 0,
    invoicesAmount: 0,
    ...fields,
  });

describe('CreditNote — остаток кредита', () => {
  it('остаток = сумма − возвращено деньгами − зачтено в счета', () => {
    const doc = note({ amount: 10000, refundedAmount: 2000, invoicesAmount: 3000 });

    expect(doc.creditsRemaining).toBe(5000);
    expect(doc.creditsUsed).toBe(5000);
  });

  it('неиспользованная нота держит остаток равным сумме', () => {
    const doc = note({ amount: 10000 });

    expect(doc.creditsRemaining).toBe(10000);
    expect(doc.creditsUsed).toBe(0);
  });

  it('перебор возвратов не уводит остаток в минус', () => {
    // Такое бывает при ручных правках: остаток обязан упереться в ноль.
    const doc = note({ amount: 1000, refundedAmount: 800, invoicesAmount: 500 });

    expect(doc.creditsRemaining).toBe(0);
  });
});

describe('CreditNote — статус', () => {
  it('без даты открытия нота черновик и не опубликована', () => {
    const doc = note({ amount: 1000, openedAt: null });

    expect(doc.isDraft).toBe(true);
    expect(doc.isPublished).toBe(false);
    expect(doc.isOpen).toBe(false);
  });

  it('открытая нота с остатком считается открытой', () => {
    const doc = note({ amount: 1000, openedAt: new Date('2026-08-04') });

    expect(doc.isPublished).toBe(true);
    expect(doc.isOpen).toBe(true);
    expect(doc.isClosed).toBe(false);
  });

  it('полностью использованная нота закрывается', () => {
    const doc = note({
      amount: 1000,
      refundedAmount: 400,
      invoicesAmount: 600,
      openedAt: new Date('2026-08-04'),
    });

    expect(doc.creditsRemaining).toBe(0);
    expect(doc.isOpen).toBe(false);
    expect(doc.isClosed).toBeTruthy();
  });

  it('черновик не считается закрытым, даже если остаток нулевой', () => {
    const doc = note({ amount: 0, openedAt: null });

    expect(doc.creditsRemaining).toBe(0);
    expect(doc.isClosed).toBeFalsy();
  });
});

describe('CreditNote — скидка и итог', () => {
  it('скидка суммой и процентом считается как в остальных документах', () => {
    const byAmount = note({
      amount: 10000,
      discount: 1500,
      discountType: DiscountType.Amount,
    });
    const byPercent = note({
      amount: 10000,
      discount: 15,
      discountType: DiscountType.Percentage,
    });

    expect(byAmount.discountAmount).toBe(1500);
    expect(byAmount.discountPercentage).toBeNull();
    expect(byPercent.discountAmount).toBe(1500);
    expect(byPercent.discountPercentage).toBe(15);
  });

  it('итог = позиции − скидка + корректировка', () => {
    const doc = note({
      amount: 10000,
      discount: 10,
      discountType: DiscountType.Percentage,
      adjustment: 200,
    });

    expect(doc.subtotal).toBe(10000);
    expect(doc.total).toBe(9200);
  });

  it('суммы пересчитываются в валюту учёта по курсу', () => {
    const doc = note({
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

  it('нулевые скидка и корректировка в валюте учёта дают пусто, а не ноль', () => {
    const doc = note({ amount: 1000, discountType: DiscountType.Amount, exchangeRate: 90 });

    expect(doc.discountAmountLocal).toBeNull();
    expect(doc.adjustmentLocal).toBeNull();
  });
});
