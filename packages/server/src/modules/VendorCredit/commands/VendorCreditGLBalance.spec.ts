// © 2026 Bigfin
import { VendorCreditGL } from './VendorCreditGL';
import { VendorCredit } from '../models/VendorCredit';
import { Ledger } from '@/modules/Ledger/Ledger';

/**
 * Д1 «НДС до конца», срез 3 — возвраты поставщикам.
 *
 * Зеркально кредит-нотам: возврат товара поставщику уменьшает входящий НДС,
 * принятый к вычету. До этой правки налоговых строк не было вовсе, и вычет
 * оставался завышенным после возврата.
 */
const vendorCredit = (over: Record<string, any> = {}): any =>
  Object.assign(new VendorCredit(), {
    id: 1,
    amount: 50000,
    isInclusiveTax: false,
    exchangeRate: 1,
    currencyCode: 'RUB',
    vendorCreditDate: '2026-07-30',
    vendorCreditNumber: 'VC-1',
    referenceNo: null,
    vendorId: 6,
    userId: 1,
    branchId: null,
    discount: 0,
    adjustment: 0,
    entries: [],
    ...over,
  });

const entry = (over: Record<string, any> = {}) => ({
  costAccountId: 20,
  item: { costAccountId: 20 },
  itemId: 1,
  description: '',
  taxRateId: null,
  taxRate: 0,
  taxAmount: 0,
  totalExcludingTax: 50000,
  ...over,
});

const glOf = (doc: any) => {
  const gl = new VendorCreditGL(doc);
  gl.setAPAccountId(10);
  gl.setPurchaseDiscountAccountId(12);
  gl.setOtherExpensesAccountId(13);
  gl.setTaxReceivableAccountId(14);
  return gl;
};

const balanceOf = (doc: any): number =>
  new Ledger(glOf(doc).getVendorCreditGLEntries()).getDebitCreditDifference();

const taxEntriesOf = (doc: any) =>
  glOf(doc)
    .getVendorCreditGLEntries()
    .filter((e: any) => e.accountId === 14);

describe('VendorCredit.total — возврат поставщику с НДС', () => {
  it('НДС 20% сверху: поставщик возвращает сумму с налогом', () => {
    const doc = vendorCredit({ taxAmountWithheld: 10000 });
    expect(doc.total).toBe(60000);
    expect(doc.subtotalExcludingTax).toBe(50000);
  });

  it('НДС в цене: итог равен подытогу', () => {
    const doc = vendorCredit({
      amount: 60000,
      taxAmountWithheld: 10000,
      isInclusiveTax: true,
    });
    expect(doc.total).toBe(60000);
    expect(doc.subtotalExcludingTax).toBe(50000);
  });

  it('без налога и без скидки итог не превращается в «не число»', () => {
    const doc = vendorCredit({
      taxAmountWithheld: null,
      discount: undefined,
      discountType: 'percentage',
    });
    expect(Number.isFinite(doc.total)).toBe(true);
    expect(doc.total).toBe(50000);
  });
});

describe('VendorCreditGL — журнал возврата поставщику сходится', () => {
  it('налог идёт в кредит счёта «НДС к вычету» — уменьшает вычет', () => {
    const doc = vendorCredit({
      taxAmountWithheld: 10000,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 10000 })],
    });
    expect(balanceOf(doc)).toBeCloseTo(0, 2);

    const tax = taxEntriesOf(doc);
    expect(tax).toHaveLength(1);
    expect(tax[0].credit).toBe(10000);
    expect(tax[0].debit).toBe(0);
  });

  it('НДС в цене: журнал тоже сходится', () => {
    const doc = vendorCredit({
      amount: 60000,
      isInclusiveTax: true,
      taxAmountWithheld: 10000,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 10000 })],
    });
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
  });

  it('возврат без налога: налоговых строк нет, поведение прежнее', () => {
    const doc = vendorCredit({ entries: [entry()] });
    expect(taxEntriesOf(doc)).toHaveLength(0);
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
  });

  it('смешанный возврат: одна позиция с НДС, другая без', () => {
    const doc = vendorCredit({
      amount: 80000,
      taxAmountWithheld: 10000,
      entries: [
        entry({ taxRateId: 5, taxRate: 20, taxAmount: 10000 }),
        entry({ totalExcludingTax: 30000, taxAmount: 0 }),
      ],
    });
    expect(doc.total).toBe(90000);
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
    expect(taxEntriesOf(doc)).toHaveLength(1);
  });
});
