// © 2026 Bigfin
import { planVatRepost, RepostDocumentRow } from './planVatRepost';

const doc = (over: Partial<RepostDocumentRow> = {}): RepostDocumentRow => ({
  id: 1,
  isPosted: true,
  taxAmountWithheld: 0,
  entries: [{ taxRateId: 5, taxRate: 20, taxAmount: 100 }],
  ...over,
});

describe('planVatRepost', () => {
  it('берёт проведённый документ с налогом', () => {
    const plan = planVatRepost([doc()]);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]).toMatchObject({
      id: 1,
      recomputedTax: 100,
      storedTax: 0,
      taxChanged: true,
    });
    expect(plan.skippedNotPosted).toBe(0);
    expect(plan.skippedNoTax).toBe(0);
  });

  it('не трогает черновик: у него проводок нет и быть не должно', () => {
    const plan = planVatRepost([doc({ isPosted: false })]);

    expect(plan.items).toHaveLength(0);
    expect(plan.skippedNotPosted).toBe(1);
  });

  it('пропускает документ без налоговых ставок в позициях', () => {
    const plan = planVatRepost([
      doc({ entries: [{ taxRateId: null, taxRate: 0, taxAmount: NaN }] }),
    ]);

    expect(plan.items).toHaveLength(0);
    expect(plan.skippedNoTax).toBe(1);
  });

  it('считает документ налоговым, если ставка задана процентом без справочника', () => {
    const plan = planVatRepost([
      doc({ entries: [{ taxRateId: null, taxRate: 20, taxAmount: 40 }] }),
    ]);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].recomputedTax).toBe(40);
  });

  it('складывает налог по позициям и считает позицию без ставки нулём', () => {
    // Смешанный документ: одна позиция с НДС, другая без. Раньше такая
    // смесь превращала налог всего документа в «не число».
    const plan = planVatRepost([
      doc({
        entries: [
          { taxRateId: 5, taxRate: 20, taxAmount: 100 },
          { taxRateId: null, taxRate: null, taxAmount: NaN },
          { taxRateId: 5, taxRate: 20, taxAmount: 33.33 },
        ],
      }),
    ]);

    expect(plan.items[0].recomputedTax).toBe(133.33);
  });

  it('не считает изменением копеечный хвост вещественных чисел', () => {
    const plan = planVatRepost([
      doc({
        taxAmountWithheld: 100.1,
        entries: [
          { taxRateId: 5, taxRate: 20, taxAmount: 33.37 },
          { taxRateId: 5, taxRate: 20, taxAmount: 66.73 },
        ],
      }),
    ]);

    expect(plan.items[0].taxChanged).toBe(false);
  });

  it('всё равно берёт документ в работу, когда сумма налога совпала', () => {
    // Сумма в документе могла быть правильной, а проводки — нет:
    // до правок #188–#192 строка налога в журнал просто не попадала.
    const plan = planVatRepost([doc({ taxAmountWithheld: 100 })]);

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].taxChanged).toBe(false);
  });

  it('читает сумму налога, пришедшую из базы строкой', () => {
    const plan = planVatRepost([doc({ taxAmountWithheld: '100.00' })]);

    expect(plan.items[0].storedTax).toBe(100);
    expect(plan.items[0].taxChanged).toBe(false);
  });

  it('устойчив к документу без позиций и к мусору в суммах', () => {
    const plan = planVatRepost([
      doc({ id: 2, entries: undefined }),
      doc({ id: 3, taxAmountWithheld: null as any }),
      doc({ id: 4, taxAmountWithheld: 'нет' as any }),
    ]);

    expect(plan.skippedNoTax).toBe(1);
    expect(plan.items.map((i) => i.id)).toEqual([3, 4]);
    expect(plan.items[0].storedTax).toBe(0);
  });

  it('считает несколько документов независимо', () => {
    const plan = planVatRepost([
      doc({ id: 10 }),
      doc({ id: 11, isPosted: false }),
      doc({ id: 12, entries: [{ taxRateId: null, taxRate: 0 }] }),
      doc({ id: 13, taxAmountWithheld: 100 }),
    ]);

    expect(plan.items.map((i) => i.id)).toEqual([10, 13]);
    expect(plan.skippedNotPosted).toBe(1);
    expect(plan.skippedNoTax).toBe(1);
  });
});
