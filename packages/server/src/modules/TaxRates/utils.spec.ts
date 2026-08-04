import { getInclusiveTaxAmount, getExlusiveTaxAmount } from './utils';

/**
 * Две формулы налога (㉔), которые легко перепутать местами:
 *  - «в том числе» — налог уже сидит в цене, его нужно выделить;
 *  - «сверху» — налог начисляется на цену.
 * Перепутать их — значит ошибиться в НДС на каждой строке документа.
 */
describe('налог «в том числе»', () => {
  it('выделяет НДС 20% из цены с налогом', () => {
    // 1200 с НДС → налог 200, база 1000.
    expect(getInclusiveTaxAmount(1200, 20)).toBeCloseTo(200, 6);
  });

  it('выделяет НДС 10% (льготная ставка)', () => {
    // 1100 с НДС → налог 100.
    expect(getInclusiveTaxAmount(1100, 10)).toBeCloseTo(100, 6);
  });

  it('при ставке 0% налога нет', () => {
    expect(getInclusiveTaxAmount(1200, 0)).toBe(0);
  });

  it('на нулевой сумме даёт ноль, а не деление на ноль', () => {
    expect(getInclusiveTaxAmount(0, 20)).toBe(0);
  });

  it('выделенный налог всегда меньше самой суммы', () => {
    const amount = 5000;

    expect(getInclusiveTaxAmount(amount, 20)).toBeLessThan(amount);
  });
});

describe('налог «сверху»', () => {
  it('начисляет НДС 20% на цену без налога', () => {
    expect(getExlusiveTaxAmount(1000, 20)).toBeCloseTo(200, 6);
  });

  it('начисляет НДС 10%', () => {
    expect(getExlusiveTaxAmount(1000, 10)).toBeCloseTo(100, 6);
  });

  it('при ставке 0% налога нет', () => {
    expect(getExlusiveTaxAmount(1000, 0)).toBe(0);
  });
});

describe('две формулы вместе', () => {
  it('налог «сверху» больше налога «в том числе» при той же сумме', () => {
    // Классическая ошибка: посчитать «сверху» там, где цена уже с налогом.
    expect(getExlusiveTaxAmount(1200, 20)).toBeGreaterThan(
      getInclusiveTaxAmount(1200, 20),
    );
  });

  it('база + налог «сверху» = сумма, из которой этот налог выделяется обратно', () => {
    const base = 1000;
    const withTax = base + getExlusiveTaxAmount(base, 20);

    expect(withTax).toBe(1200);
    expect(getInclusiveTaxAmount(withTax, 20)).toBeCloseTo(200, 6);
  });
});
