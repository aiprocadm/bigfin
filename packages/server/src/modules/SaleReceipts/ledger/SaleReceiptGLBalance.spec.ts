// © 2026 Bigfin
import { SaleReceiptGL } from './SaleReceiptGL';
import { SaleReceipt } from '../models/SaleReceipt';
import { Ledger } from '@/modules/Ledger/Ledger';

/**
 * Д1 «НДС до конца», срез 1 — чеки.
 *
 * До этой правки чек не знал про налог вовсе: в кассу попадала сумма без
 * НДС, а сам налог никуда не проводился — продажи за наличные в анализе
 * НДС выглядели как ноль.
 */
const receipt = (over: Record<string, any> = {}): any =>
  Object.assign(new SaleReceipt(), {
    id: 1,
    amount: 100000,
    isInclusiveTax: false,
    exchangeRate: 1,
    currencyCode: 'RUB',
    receiptDate: '2026-07-25',
    receiptNumber: 'R-1',
    referenceNo: null,
    createdAt: '2026-07-25',
    depositAccountId: 1,
    branchId: null,
    userId: 1,
    adjustment: 0,
    discount: 0,
    entries: [],
    ...over,
  });

// Счёт дохода чек берёт из карточки номенклатуры (entry.item.sellAccountId),
// а не из самой позиции — в отличие от счёта покупателю.
const entry = (over: Record<string, any> = {}) => ({
  item: { sellAccountId: 20 },
  itemId: 1,
  description: '',
  taxRateId: null,
  taxRate: 0,
  taxAmount: 0,
  totalExcludingTax: 100000,
  ...over,
});

const balanceOf = (doc: any): number => {
  const gl = new SaleReceiptGL(doc);
  gl.setDiscountAccountId(12);
  gl.setOtherChargesAccountId(13);
  gl.setTaxPayableAccountId(11);
  return new Ledger(gl.getIncomeGLEntries()).getDebitCreditDifference();
};

const taxEntriesOf = (doc: any) => {
  const gl = new SaleReceiptGL(doc);
  gl.setDiscountAccountId(12);
  gl.setOtherChargesAccountId(13);
  gl.setTaxPayableAccountId(11);
  return gl.getIncomeGLEntries().filter((e: any) => e.accountId === 11);
};

describe('SaleReceipt.total — чек с НДС', () => {
  it('НДС 20% сверху: в кассу попадает сумма с налогом', () => {
    const doc = receipt({ taxAmountWithheld: 20000 });
    expect(doc.subtotal).toBe(100000);
    expect(doc.total).toBe(120000);
    expect(doc.subtotalExcludingTax).toBe(100000);
  });

  it('НДС в цене: итог равен подытогу, налог уже внутри', () => {
    const doc = receipt({
      amount: 120000,
      taxAmountWithheld: 20000,
      isInclusiveTax: true,
    });
    expect(doc.total).toBe(120000);
    expect(doc.subtotalExcludingTax).toBe(100000);
  });

  it('без налога поведение не меняется', () => {
    const doc = receipt({ taxAmountWithheld: null });
    expect(doc.total).toBe(100000);
  });

  it('без скидки итог не превращается в «не число»', () => {
    const doc = receipt({ discount: undefined, discountType: 'percentage' });
    expect(Number.isFinite(doc.total)).toBe(true);
  });
});

describe('SaleReceiptGL — журнал чека сходится', () => {
  it('НДС 20% сверху: касса 120 000 = выручка 100 000 + налог 20 000', () => {
    const doc = receipt({
      taxAmountWithheld: 20000,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 })],
    });
    expect(balanceOf(doc)).toBeCloseTo(0, 2);

    const tax = taxEntriesOf(doc);
    expect(tax).toHaveLength(1);
    expect(tax[0].credit).toBe(20000);
    expect(tax[0].taxRate).toBe(20);
  });

  it('НДС в цене: журнал тоже сходится', () => {
    const doc = receipt({
      amount: 120000,
      isInclusiveTax: true,
      taxAmountWithheld: 20000,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 })],
    });
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
  });

  it('чек без налога: налоговых строк нет, журнал сходится', () => {
    const doc = receipt({ entries: [entry()] });
    expect(taxEntriesOf(doc)).toHaveLength(0);
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
  });

  it('смешанные позиции: одна с НДС, другая без', () => {
    const doc = receipt({
      amount: 150000,
      taxAmountWithheld: 20000,
      entries: [
        entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 }),
        entry({ totalExcludingTax: 50000, taxAmount: 0 }),
      ],
    });
    expect(doc.total).toBe(170000);
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
    expect(taxEntriesOf(doc)).toHaveLength(1);
  });
});
