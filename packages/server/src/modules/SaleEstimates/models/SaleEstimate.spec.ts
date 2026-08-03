import { SaleEstimate } from './SaleEstimate';
import { DiscountType } from '@/common/types/Discount';

/**
 * Денежные правила документа (⑨/㉔): скидка суммой и процентом, итог с учётом
 * скидки и корректировки, пересчёт в валюту учёта. Те же правила повторяются
 * в счетах, чеках и кредит-нотах — здесь они закреплены на смете.
 */
const estimate = (fields: Record<string, any>): SaleEstimate =>
  Object.assign(new SaleEstimate(), {
    amount: 0,
    exchangeRate: 1,
    discount: 0,
    adjustment: 0,
    ...fields,
  });

describe('SaleEstimate — скидка', () => {
  it('скидка суммой берётся как есть', () => {
    const doc = estimate({
      amount: 10000,
      discount: 1500,
      discountType: DiscountType.Amount,
    });

    expect(doc.discountAmount).toBe(1500);
    // Процент не заполняется, когда скидка задана суммой.
    expect(doc.discountPercentage).toBeNull();
  });

  it('скидка процентом считается от суммы позиций', () => {
    const doc = estimate({
      amount: 10000,
      discount: 15,
      discountType: DiscountType.Percentage,
    });

    expect(doc.discountAmount).toBe(1500);
    expect(doc.discountPercentage).toBe(15);
  });

  it('без скидки — ноль, а не пусто', () => {
    const doc = estimate({ amount: 10000, discountType: DiscountType.Amount });

    expect(doc.discountAmount).toBe(0);
  });
});

describe('SaleEstimate — итог', () => {
  it('итог = позиции − скидка − корректировка', () => {
    const doc = estimate({
      amount: 10000,
      discount: 1000,
      discountType: DiscountType.Amount,
      adjustment: 500,
    });

    expect(doc.subtotal).toBe(10000);
    expect(doc.total).toBe(8500);
  });

  it('корректировка не обязательна', () => {
    const doc = estimate({
      amount: 10000,
      discount: 10,
      discountType: DiscountType.Percentage,
      adjustment: null,
    });

    expect(doc.total).toBe(9000);
  });

  it('скидка процентом уменьшает итог пропорционально', () => {
    const doc = estimate({
      amount: 2500,
      discount: 20,
      discountType: DiscountType.Percentage,
    });

    expect(doc.total).toBe(2000);
  });
});

describe('SaleEstimate — валюта учёта', () => {
  it('сумма позиций пересчитывается по курсу', () => {
    const doc = estimate({ amount: 100, exchangeRate: 90 });

    expect(doc.localAmount).toBe(9000);
    expect(doc.subtotalLocal).toBe(9000);
  });

  it('итог в валюте учёта считается после скидки', () => {
    const doc = estimate({
      amount: 100,
      exchangeRate: 90,
      discount: 10,
      discountType: DiscountType.Percentage,
    });

    // (100 − 10) × 90
    expect(doc.totalLocal).toBe(8100);
  });

  it('при курсе 1 суммы совпадают', () => {
    const doc = estimate({ amount: 777, exchangeRate: 1 });

    expect(doc.localAmount).toBe(777);
    expect(doc.total).toBe(777);
    expect(doc.totalLocal).toBe(777);
  });
});

describe('SaleEstimate — состояния документа', () => {
  it('считается сконвертированной только при обоих признаках', () => {
    expect(
      estimate({ convertedToInvoiceId: 5, convertedToInvoiceAt: new Date() })
        .isConvertedToInvoice,
    ).toBe(true);
    // Один признак без другого — ещё не конвертация.
    expect(estimate({ convertedToInvoiceId: 5 }).isConvertedToInvoice).toBe(
      false,
    );
    expect(estimate({}).isConvertedToInvoice).toBe(false);
  });

  it('доставка, согласование и отказ определяются по датам', () => {
    expect(estimate({ deliveredAt: new Date() }).isDelivered).toBe(true);
    expect(estimate({}).isDelivered).toBe(false);

    expect(estimate({ approvedAt: new Date() }).isApproved).toBe(true);
    expect(estimate({}).isApproved).toBe(false);

    expect(estimate({ rejectedAt: new Date() }).isRejected).toBe(true);
    expect(estimate({}).isRejected).toBe(false);
  });
});
