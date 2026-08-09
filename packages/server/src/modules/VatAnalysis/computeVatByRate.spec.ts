// © 2026 Bigfin
import { computeVatByRate, VatRateInfo } from './computeVatByRate';

const RATES: VatRateInfo[] = [
  { id: 5, name: 'НДС 20%', code: 'VAT_20', rate: 20 },
  { id: 6, name: 'НДС 10%', code: 'VAT_10', rate: 10 },
  { id: 7, name: 'НДС 0%', code: 'VAT_0', rate: 0 },
  { id: 8, name: 'Без НДС', code: 'VAT_NONE', rate: 0 },
  { id: 9, name: 'НДС 20% невозмещаемый', code: 'VAT_20_NR', rate: 20 },
];

describe('computeVatByRate', () => {
  it('разносит продажу по своей ставке: база и налог', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 5, bucket: 'salesBase', credit: 100000, debit: 0 },
        { taxRateId: 5, bucket: 'chargedTax', credit: 20000, debit: 0 },
      ],
      RATES,
    );

    expect(result).toEqual([
      {
        taxRateId: 5,
        name: 'НДС 20%',
        code: 'VAT_20',
        rate: 20,
        salesBase: 100000,
        charged: 20000,
        purchaseBase: 0,
        deductible: 0,
        nonDeductible: 0,
      },
    ]);
  });

  it('невозмещаемый налог считается отдельно от вычета', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 9, bucket: 'purchaseBase', credit: 0, debit: 80000 },
        { taxRateId: 9, bucket: 'nonDeductibleTax', credit: 0, debit: 16000 },
      ],
      RATES,
    );

    expect(result[0]).toMatchObject({
      code: 'VAT_20_NR',
      purchaseBase: 80000,
      deductible: 0,
      nonDeductible: 16000,
    });
  });

  it('возврат поставщику уменьшает и невозмещаемый налог', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 9, bucket: 'nonDeductibleTax', credit: 0, debit: 16000 },
        { taxRateId: 9, bucket: 'nonDeductibleTax', credit: 6000, debit: 0 },
      ],
      RATES,
    );

    expect(result[0].nonDeductible).toBe(10000);
  });

  it('показывает продажу по ставке 0 % — у неё есть база, но нет налога', () => {
    // Ради этого разбивка и берёт строки базы: налоговой строки по 0 %
    // не существует, и раньше такая продажа была не видна вовсе.
    const result = computeVatByRate(
      [{ taxRateId: 7, bucket: 'salesBase', credit: 500000, debit: 0 }],
      RATES,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      code: 'VAT_0',
      salesBase: 500000,
      charged: 0,
    });
  });

  it('различает «0 %» и «без НДС» — обе ставки нулевые, но это разные строки', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 7, bucket: 'salesBase', credit: 500000, debit: 0 },
        { taxRateId: 8, bucket: 'salesBase', credit: 300000, debit: 0 },
      ],
      RATES,
    );

    expect(result.map((r) => r.code)).toEqual(['VAT_0', 'VAT_NONE']);
    expect(result.map((r) => r.salesBase)).toEqual([500000, 300000]);
  });

  it('возврат покупателю уменьшает и базу, и начисленный налог', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 5, bucket: 'salesBase', credit: 100000, debit: 0 },
        { taxRateId: 5, bucket: 'chargedTax', credit: 20000, debit: 0 },
        // Кредит-нота на 30 000 + НДС.
        { taxRateId: 5, bucket: 'salesBase', credit: 0, debit: 30000 },
        { taxRateId: 5, bucket: 'chargedTax', credit: 0, debit: 6000 },
      ],
      RATES,
    );

    expect(result[0]).toMatchObject({ salesBase: 70000, charged: 14000 });
  });

  it('закупка и возврат поставщику считаются в обратную сторону', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 5, bucket: 'purchaseBase', credit: 0, debit: 50000 },
        { taxRateId: 5, bucket: 'deductibleTax', credit: 0, debit: 10000 },
        // Возврат поставщику на 20 000 + НДС.
        { taxRateId: 5, bucket: 'purchaseBase', credit: 20000, debit: 0 },
        { taxRateId: 5, bucket: 'deductibleTax', credit: 4000, debit: 0 },
      ],
      RATES,
    );

    expect(result[0]).toMatchObject({ purchaseBase: 30000, deductible: 6000 });
  });

  it('продажи и закупки по одной ставке живут в одной строке', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 5, bucket: 'salesBase', credit: 100000, debit: 0 },
        { taxRateId: 5, bucket: 'chargedTax', credit: 20000, debit: 0 },
        { taxRateId: 5, bucket: 'purchaseBase', credit: 0, debit: 50000 },
        { taxRateId: 5, bucket: 'deductibleTax', credit: 0, debit: 10000 },
      ],
      RATES,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      salesBase: 100000,
      charged: 20000,
      purchaseBase: 50000,
      deductible: 10000,
    });
  });

  it('возвратов больше, чем продаж, — показываем ноль, а не минус', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 5, bucket: 'salesBase', credit: 10000, debit: 40000 },
        { taxRateId: 5, bucket: 'chargedTax', credit: 2000, debit: 8000 },
        { taxRateId: 5, bucket: 'purchaseBase', credit: 0, debit: 1000 },
      ],
      RATES,
    );

    expect(result[0]).toMatchObject({
      salesBase: 0,
      charged: 0,
      purchaseBase: 1000,
    });
  });

  it('ставки без движений в выдачу не попадают', () => {
    const result = computeVatByRate(
      [{ taxRateId: 6, bucket: 'salesBase', credit: 0, debit: 0 }],
      RATES,
    );

    expect(result).toEqual([]);
  });

  it('движения по неизвестной ставке отбрасываются', () => {
    const result = computeVatByRate(
      [{ taxRateId: 999, bucket: 'salesBase', credit: 100000, debit: 0 }],
      RATES,
    );

    expect(result).toEqual([]);
  });

  it('сортирует от большей ставки к меньшей', () => {
    const result = computeVatByRate(
      [
        { taxRateId: 6, bucket: 'salesBase', credit: 10, debit: 0 },
        { taxRateId: 5, bucket: 'salesBase', credit: 10, debit: 0 },
        { taxRateId: 7, bucket: 'salesBase', credit: 10, debit: 0 },
      ],
      RATES,
    );

    expect(result.map((r) => r.rate)).toEqual([20, 10, 0]);
  });
});
