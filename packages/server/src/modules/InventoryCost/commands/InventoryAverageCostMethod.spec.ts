import { InventoryAverageCostMethod } from './InventoryAverageCostMethod';

/**
 * Себестоимость по средней стоимости (⑨/склад) — сердце расчёта прибыли:
 * каждое списание берёт цену как «весь склад / всё количество» на момент
 * операции. Логика чистая (без БД), но до этих тестов не была покрыта.
 */
const tx = (over: Record<string, any>) => ({
  id: over.id ?? 1,
  date: '2026-06-01',
  itemId: 10,
  entryId: 100,
  transactionId: 1000,
  transactionType: 'SaleInvoice',
  createdAt: '2026-06-01',
  costAccountId: 5,
  branchId: null,
  warehouseId: null,
  ...over,
});

const IN = (quantity: number, rate: number, id = 1) =>
  tx({ id, direction: 'IN', quantity, rate });
const OUT = (quantity: number, rate: number, id = 2) =>
  tx({ id, direction: 'OUT', quantity, rate });

const method = () => new InventoryAverageCostMethod();

describe('InventoryAverageCostMethod — поступления', () => {
  it('себестоимость поступления = цена × количество', () => {
    const result = method().trackingCostTransactions([IN(10, 100)] as any);

    expect(result).toHaveLength(1);
    expect(result[0].cost).toBe(1000);
    expect(result[0].direction).toBe('IN');
  });

  it('несколько поступлений накапливаются независимо', () => {
    const result = method().trackingCostTransactions([
      IN(10, 100, 1),
      IN(5, 200, 2),
    ] as any);

    expect(result.map((r) => r.cost)).toEqual([1000, 1000]);
  });
});

describe('InventoryAverageCostMethod — списания по средней', () => {
  it('списание берёт среднюю цену склада', () => {
    // 10 шт по 100 и 10 шт по 200 → средняя 150.
    const result = method().trackingCostTransactions([
      IN(10, 100, 1),
      IN(10, 200, 2),
      OUT(4, 999, 3),
    ] as any);

    const out = result.find((r) => r.direction === 'OUT');
    expect(out.cost).toBe(600); // 4 × 150
    // Цена продажи на себестоимость не влияет.
    expect(out.rate).toBe(999);
  });

  it('средняя пересчитывается после каждого движения', () => {
    // 10×100 → списали 5 (по 100) → осталось 5×100=500;
    // приход 5×300 → склад 10 шт на 2000 → средняя 200.
    const result = method().trackingCostTransactions([
      IN(10, 100, 1),
      OUT(5, 150, 2),
      IN(5, 300, 3),
      OUT(2, 150, 4),
    ] as any);

    const outs = result.filter((r) => r.direction === 'OUT');
    expect(outs[0].cost).toBe(500); // 5 × 100
    expect(outs[1].cost).toBe(400); // 2 × 200
  });

  it('учитывает начальные остатки склада', () => {
    // Начально 20 шт на 4000 (средняя 200) — списание идёт по ней.
    const result = method().trackingCostTransactions(
      [OUT(3, 500, 1)] as any,
      20,
      4000,
    );

    expect(result[0].cost).toBe(600); // 3 × 200
  });

  it('списание при пустом складе даёт нулевую себестоимость', () => {
    const result = method().trackingCostTransactions([OUT(5, 300, 1)] as any);

    expect(result[0].cost).toBe(0);
  });
});

describe('InventoryAverageCostMethod — продажа больше остатка', () => {
  it('часть в пределах остатка идёт по средней, излишек — с нулевой себестоимостью', () => {
    // На складе 5 шт по 100; продали 8.
    const result = method().trackingCostTransactions([
      IN(5, 100, 1),
      OUT(8, 300, 2),
    ] as any);

    const outs = result.filter((r) => r.direction === 'OUT');
    expect(outs).toHaveLength(2);

    // Первая часть — 5 шт по средней 100.
    expect(outs[0].quantity).toBe(5);
    expect(outs[0].cost).toBe(500);

    // Излишек — 3 шт, себестоимости нет (товара на складе не было).
    expect(outs[1].quantity).toBe(3);
    expect(outs[1].cost).toBe(0);
  });

  it('после ухода в минус склад не уходит в отрицательный остаток', () => {
    // Продали больше, чем есть, затем поступление и ещё продажа:
    // новое поступление должно считаться от чистого листа.
    const result = method().trackingCostTransactions([
      IN(2, 100, 1),
      OUT(5, 300, 2),
      IN(4, 250, 3),
      OUT(4, 300, 4),
    ] as any);

    const outs = result.filter((r) => r.direction === 'OUT');
    const last = outs[outs.length - 1];

    // Остаток после «минуса» обнуляется, поэтому последняя продажа
    // считается по цене последнего поступления — 250.
    expect(last.cost).toBe(1000); // 4 × 250
  });
});

describe('InventoryAverageCostMethod — форма результата', () => {
  it('переносит поля операции, нужные для проводок', () => {
    const result = method().trackingCostTransactions([
      IN(1, 100, 42),
    ] as any);

    expect(result[0]).toMatchObject({
      invTransId: 42,
      inventoryTransactionId: 42,
      itemId: 10,
      entryId: 100,
      transactionId: 1000,
      transactionType: 'SaleInvoice',
      costAccountId: 5,
    });
  });

  it('пустой список операций даёт пустой результат', () => {
    expect(method().trackingCostTransactions([] as any)).toEqual([]);
  });
});
