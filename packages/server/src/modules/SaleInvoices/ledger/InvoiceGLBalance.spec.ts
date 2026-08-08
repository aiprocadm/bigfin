// © 2026 Bigfin
import { InvoiceGL } from './InvoiceGL';
import { SaleInvoice } from '../models/SaleInvoice';
import { Ledger } from '@/modules/Ledger/Ledger';

/**
 * Инвариант двойной записи для счёта покупателю: дебет = кредит.
 *
 * Приёмка ㉖ поймала перекос вживую: счёт «НДС 20% сверху» давал дебиторку
 * 100 000 против кредита 120 000. Хранилище журнала такие перекосы молча
 * записывало, поэтому проверка нужна именно тестом.
 */
const buildInvoice = (over: Record<string, any> = {}): any => {
  const model: any = Object.assign(new SaleInvoice(), {
    id: 1,
    branchId: null,
    projectId: null,
    currencyCode: 'RUB',
    exchangeRate: 1,
    customerId: 3,
    invoiceDate: '2026-07-25',
    invoiceNo: 'VAT-1',
    referenceNo: null,
    createdAt: '2026-07-25',
    balance: 100000,
    isInclusiveTax: false,
    paymentAmount: 0,
    writtenoffAmount: 0,
    creditedAmount: 0,
    entries: [],
    ...over,
  });
  return model;
};

/** Позиция документа с уже посчитанными «виртуальными» суммами. */
const entry = (over: Record<string, any> = {}) => ({
  sellAccountId: 20,
  itemId: 1,
  description: '',
  taxRateId: null,
  taxRate: 0,
  taxAmount: 0,
  totalExcludingTax: 100000,
  ...over,
});

const balanceOf = (invoice: any): number => {
  const gl = new InvoiceGL(invoice);
  gl.setARAccountId(10);
  gl.setTaxPayableAccountId(11);
  gl.setDiscountAccountId(12);
  gl.setOtherChargesAccountId(13);
  return new Ledger(gl.getInvoiceGLEntries()).getDebitCreditDifference();
};

describe('InvoiceGL — журнал сходится', () => {
  it('НДС 20% сверху', () => {
    const invoice = buildInvoice({
      taxAmountWithheld: 20000,
      isInclusiveTax: false,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 })],
    });
    expect(invoice.total).toBe(120000);
    expect(balanceOf(invoice)).toBeCloseTo(0, 2);
  });

  it('НДС в цене', () => {
    const invoice = buildInvoice({
      balance: 120000,
      taxAmountWithheld: 20000,
      isInclusiveTax: true,
      entries: [entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 })],
    });
    expect(invoice.total).toBe(120000);
    expect(balanceOf(invoice)).toBeCloseTo(0, 2);
  });

  it('без налога — поведение не меняется', () => {
    const invoice = buildInvoice({ entries: [entry()] });
    expect(invoice.total).toBe(100000);
    expect(balanceOf(invoice)).toBeCloseTo(0, 2);
  });

  // Смешанный счёт: у позиции без ставки налог не посчитан — раньше это
  // превращало налог всего документа в «не число».
  it('смешанные позиции: одна с НДС, другая без', () => {
    const invoice = buildInvoice({
      balance: 150000,
      taxAmountWithheld: 20000,
      entries: [
        entry({ taxRateId: 5, taxRate: 20, taxAmount: 20000 }),
        entry({ totalExcludingTax: 50000, taxAmount: 0 }),
      ],
    });
    expect(invoice.total).toBe(170000);
    expect(balanceOf(invoice)).toBeCloseTo(0, 2);
  });

  it('некруглая сумма: копейки не ломают сходимость', () => {
    const invoice = buildInvoice({
      balance: 8333.33,
      taxAmountWithheld: 1666.67,
      entries: [
        entry({
          totalExcludingTax: 8333.33,
          taxRateId: 5,
          taxRate: 20,
          taxAmount: 1666.67,
        }),
      ],
    });
    expect(Math.abs(balanceOf(invoice))).toBeLessThan(0.005);
  });
});
