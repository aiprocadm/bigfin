import { DuplicateBillService } from './DuplicateBill.service';

/**
 * О2 (карта v13): дублирование расхода (счёта поставщика) в черновик.
 */
describe('DuplicateBillService', () => {
  const src = {
    id: 11,
    vendorId: 8,
    billDate: '2026-03-01',
    dueDate: '2026-04-01',
    billNumber: 'BILL-500',
    referenceNo: 'PO-9',
    open: true,
    openedAt: '2026-03-01',
    note: 'Канцтовары на квартал',
    exchangeRate: 1,
    branchId: 2,
    isInclusiveTax: true,
    discount: 10,
    discountType: 'percentage',
    adjustment: -50,
    entries: [
      {
        id: 77,
        index: 1,
        itemId: 4,
        rate: 250,
        quantity: 3,
        description: 'Бумага',
        taxRateId: 6,
        landedCost: true,
      },
    ],
  };

  const build = () => {
    const createBill = jest.fn().mockResolvedValue({ id: 42 });
    const service = new DuplicateBillService(
      { getBill: jest.fn().mockResolvedValue(src) } as any,
      { createBill } as any,
    );
    return { service, createBill };
  };

  it('создаёт копию как ЧЕРНОВИК (open=false) и без номера оригинала', async () => {
    const { service, createBill } = build();
    await service.duplicate(11);

    const dto = createBill.mock.calls[0][0];
    expect(dto.open).toBe(false);
    // Номер расхода уникален и приходит с бумаги поставщика — копия без номера.
    expect(dto.billNumber).toBe('');
    expect(dto.vendorId).toBe(8);
    expect(dto.note).toBe('Канцтовары на квартал');
  });

  it('копирует скидку и корректировку уровня документа', async () => {
    const { service, createBill } = build();
    await service.duplicate(11);

    const dto = createBill.mock.calls[0][0];
    expect(dto.discount).toBe(10);
    expect(dto.discountType).toBe('percentage');
    expect(dto.adjustment).toBe(-50);
  });

  it('копирует позиции без их id (новые строки)', async () => {
    const { service, createBill } = build();
    await service.duplicate(11);

    const dto = createBill.mock.calls[0][0];
    expect(dto.entries).toHaveLength(1);
    expect(dto.entries[0]).toEqual({
      index: 1,
      itemId: 4,
      rate: 250,
      quantity: 3,
      discount: undefined,
      discountType: undefined,
      description: 'Бумага',
      taxRateId: 6,
      warehouseId: undefined,
      landedCost: true,
    });
    expect((dto.entries[0] as any).id).toBeUndefined();
  });

  it('возвращает созданный расход', async () => {
    const { service } = build();
    await expect(service.duplicate(11)).resolves.toEqual({ id: 42 });
  });
});
