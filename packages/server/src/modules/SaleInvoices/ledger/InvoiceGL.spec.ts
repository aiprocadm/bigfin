import { InvoiceGL } from './InvoiceGL';

describe('InvoiceGL — deal (project) dimension', () => {
  it('stamps projectId onto every invoice GL entry', () => {
    const invoice: any = {
      id: 1,
      projectId: 7,
      branchId: 2,
      currencyCode: 'RUB',
      exchangeRate: 1,
      totalLocal: 100,
      customerId: 3,
      entries: [],
      invoiceDate: '2026-06-01',
      invoiceNo: '1',
      referenceNo: null,
      createdAt: '2026-06-01',
      discountAmountLocal: 0,
      adjustmentLocal: 0,
    };
    const gl = new InvoiceGL(invoice);
    gl.setARAccountId(10);
    gl.setTaxPayableAccountId(11);
    gl.setDiscountAccountId(12);
    gl.setOtherChargesAccountId(13);

    const entries = gl.getInvoiceGLEntries();

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e: any) => e.projectId === 7)).toBe(true);
  });
});
