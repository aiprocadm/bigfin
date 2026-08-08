// © 2026 Bigfin
import { CreditNoteGL } from './CreditNoteGL';
import { CreditNote } from '../models/CreditNote';
import { Ledger } from '@/modules/Ledger/Ledger';

/**
 * Д1 «НДС до конца», срез 2 — кредит-ноты (возврат от покупателя).
 *
 * Возврат обязан уменьшать начисленный при продаже НДС. До этой правки
 * налоговых строк у кредит-ноты не было вовсе: «НДС к уплате» оставался
 * завышенным даже после того, как товар вернули и деньги отдали.
 */
const creditNote = (over: Record<string, any> = {}): any =>
  Object.assign(new CreditNote(), {
    id: 1,
    amount: 100000,
    isInclusiveTax: false,
    exchangeRate: 1,
    currencyCode: 'RUB',
    creditNoteDate: '2026-07-29',
    creditNoteNumber: 'CN-1',
    referenceNo: null,
    customerId: 1,
    userId: 1,
    branchId: null,
    discount: 0,
    adjustment: 0,
    entries: [],
    ...over,
  });

const entry = (over: Record<string, any> = {}) => ({
  sellAccountId: 20,
  item: { sellAccountId: 20 },
  itemId: 1,
  description: '',
  taxRateId: null,
  taxRate: 0,
  taxAmount: 0,
  totalExcludingTax: 100000,
  ...over,
});

const glOf = (doc: any) => {
  const gl = new CreditNoteGL(doc);
  gl.setARAccountId(10);
  gl.setDiscountAccountId(12);
  gl.setAdjustmentAccountId(13);
  gl.setTaxPayableAccountId(11);
  return gl;
};

const balanceOf = (doc: any): number =>
  new Ledger(glOf(doc).getCreditNoteGLEntries()).getDebitCreditDifference();

const taxEntriesOf = (doc: any) =>
  glOf(doc)
    .getCreditNoteGLEntries()
    .filter((e: any) => e.accountId === 11);

describe('CreditNote.total — возврат с НДС', () => {
  it('НДС 20% сверху: покупателю возвращается сумма с налогом', () => {
    const doc = creditNote({ taxAmountWithheld: 20000 });
    expect(doc.total).toBe(120000);
    expect(doc.subtotalExcludingTax).toBe(100000);
  });

  it('НДС в цене: итог равен подытогу', () => {
    const doc = creditNote({
      amount: 120000,
      taxAmountWithheld: 20000,
      isInclusiveTax: true,
    });
    expect(doc.total).toBe(120000);
    expect(doc.subtotalExcludingTax).toBe(100000);
  });

  it('без налога и без скидки итог не превращается в «не число»', () => {
    const doc = creditNote({
      taxAmountWithheld: null,
      discount: undefined,
      discountType: 'percentage',
    });
    expect(Number.isFinite(doc.total)).toBe(true);
    expect(doc.total).toBe(100000);
  });
});

describe('CreditNoteGL — журнал возврата сходится', () => {
  it('НДС 20% сверху: налог уменьшает начисленный (идёт в дебет)', () => {
    const doc = creditNote({
      taxAmountWithheld: 20000,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 })],
    });
    expect(balanceOf(doc)).toBeCloseTo(0, 2);

    const tax = taxEntriesOf(doc);
    expect(tax).toHaveLength(1);
    // Дебет налогового счёта — это уменьшение начисленного налога.
    expect(tax[0].debit).toBe(20000);
    expect(tax[0].credit).toBe(0);
  });

  it('НДС в цене: журнал тоже сходится', () => {
    const doc = creditNote({
      amount: 120000,
      isInclusiveTax: true,
      taxAmountWithheld: 20000,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 })],
    });
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
  });

  it('возврат без налога: налоговых строк нет, поведение прежнее', () => {
    const doc = creditNote({ entries: [entry()] });
    expect(taxEntriesOf(doc)).toHaveLength(0);
    expect(balanceOf(doc)).toBeCloseTo(0, 2);
  });

  it('смешанный возврат: одна позиция с НДС, другая без', () => {
    const doc = creditNote({
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
