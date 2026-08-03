import {
  groupInventoryTransactionsByTypeId,
  transformItemEntriesToInventory,
} from './utils';

describe('groupInventoryTransactionsByTypeId', () => {
  it('складывает в одну группу операции одного документа', () => {
    const groups = groupInventoryTransactionsByTypeId([
      { transactionType: 'SaleInvoice', transactionId: 1 },
      { transactionType: 'SaleInvoice', transactionId: 1 },
      { transactionType: 'SaleInvoice', transactionId: 2 },
      { transactionType: 'Bill', transactionId: 1 },
    ]);

    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(2);
  });

  it('одинаковый номер у разных типов документов не смешивается', () => {
    const groups = groupInventoryTransactionsByTypeId([
      { transactionType: 'SaleInvoice', transactionId: 7 },
      { transactionType: 'Bill', transactionId: 7 },
    ]);

    expect(groups).toHaveLength(2);
  });

  it('пустой список — пустой результат', () => {
    expect(groupInventoryTransactionsByTypeId([])).toEqual([]);
  });
});

describe('transformItemEntriesToInventory', () => {
  const base = {
    transactionId: 55,
    transactionType: 'SaleInvoice' as any,
    transactionNumber: 'INV-1',
    warehouseId: 3,
    date: '2026-06-01',
    direction: 'OUT' as any,
    createdAt: new Date('2026-06-01'),
  };

  it('разворачивает позиции документа в складские движения', () => {
    const result = transformItemEntriesToInventory({
      ...base,
      entries: [
        { id: 1, itemId: 10, quantity: 2, rate: 100 },
        { id: 2, itemId: 11, quantity: 5, rate: 50 },
      ] as any,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      itemId: 10,
      quantity: 2,
      rate: 100,
      transactionId: 55,
      transactionType: 'SaleInvoice',
      direction: 'OUT',
      entryId: 1,
    });
  });

  it('пересчитывает цену по курсу валюты документа', () => {
    const result = transformItemEntriesToInventory({
      ...base,
      exchangeRate: 90,
      entries: [{ id: 1, itemId: 10, quantity: 1, rate: 10 }] as any,
    });

    // Позиция в валюте: 10 × 90 = 900 в валюте учёта.
    expect(result[0].rate).toBe(900);
  });

  it('без курса цена берётся как есть', () => {
    const result = transformItemEntriesToInventory({
      ...base,
      entries: [{ id: 1, itemId: 10, quantity: 1, rate: 10 }] as any,
    });

    expect(result[0].rate).toBe(10);
  });

  it('склад позиции важнее склада документа', () => {
    const result = transformItemEntriesToInventory({
      ...base,
      entries: [
        { id: 1, itemId: 10, quantity: 1, rate: 10, warehouseId: 9 },
        { id: 2, itemId: 11, quantity: 1, rate: 10 },
      ] as any,
    });

    expect(result[0].warehouseId).toBe(9);
    // У позиции склад не указан — берётся склад документа.
    expect(result[1].warehouseId).toBe(3);
  });

  it('в движение попадают номер документа и описание позиции', () => {
    const result = transformItemEntriesToInventory({
      ...base,
      entries: [
        { id: 1, itemId: 10, quantity: 1, rate: 10, description: 'Стул' },
      ] as any,
    });

    expect(result[0].meta).toEqual({
      transactionNumber: 'INV-1',
      description: 'Стул',
    });
  });
});
