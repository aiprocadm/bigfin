import { DuplicateSaleInvoiceService } from './DuplicateSaleInvoice.service';

/**
 * О2 (карта v13): дублирование счёта покупателя в черновик.
 */
describe('DuplicateSaleInvoiceService', () => {
  const src = {
    id: 7,
    customerId: 5,
    invoiceDate: '2026-01-01',
    dueDate: '2026-02-01',
    invoiceNo: 'INV-100',
    referenceNo: 'REF-1',
    delivered: true,
    deliveredAt: '2026-01-01',
    invoiceMessage: 'Спасибо за заказ',
    termsConditions: 'Оплата в 30 дней',
    exchangeRate: 1,
    branchId: 3,
    isInclusiveTax: false,
    entries: [
      {
        id: 55,
        index: 1,
        itemId: 9,
        rate: 100,
        quantity: 2,
        description: 'Услуга',
        taxRateId: 4,
      },
    ],
  };

  const build = () => {
    const createSaleInvoice = jest.fn().mockResolvedValue({ id: 99 });
    const service = new DuplicateSaleInvoiceService(
      { getSaleInvoice: jest.fn().mockResolvedValue(src) } as any,
      { createSaleInvoice } as any,
    );
    return { service, createSaleInvoice };
  };

  it('создаёт копию как ЧЕРНОВИК (delivered=false) и без номера оригинала', async () => {
    const { service, createSaleInvoice } = build();
    await service.duplicate(7);

    const dto = createSaleInvoice.mock.calls[0][0];
    expect(dto.delivered).toBe(false);
    expect(dto.invoiceNo).toBeUndefined();
    expect(dto.customerId).toBe(5);
    expect(dto.termsConditions).toBe('Оплата в 30 дней');
  });

  it('копирует позиции без их id (новые строки)', async () => {
    const { service, createSaleInvoice } = build();
    await service.duplicate(7);

    const dto = createSaleInvoice.mock.calls[0][0];
    expect(dto.entries).toHaveLength(1);
    expect(dto.entries[0]).toEqual({
      index: 1,
      itemId: 9,
      rate: 100,
      quantity: 2,
      discount: undefined,
      discountType: undefined,
      description: 'Услуга',
      taxRateId: 4,
      warehouseId: undefined,
    });
    expect((dto.entries[0] as any).id).toBeUndefined();
  });

  it('возвращает созданный счёт', async () => {
    const { service } = build();
    await expect(service.duplicate(7)).resolves.toEqual({ id: 99 });
  });
});
