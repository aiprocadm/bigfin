// © 2026 Bigfin
import { normalizeInstallments, requestDueDate, totalsByCurrency } from './installments';

/** FT-053 ТЗ-3: заявка с несколькими плановыми оплатами. */
describe('плановые оплаты заявки', () => {
  it('AC: 1 000 000 = 600 000 + 400 000 — по порядку дат', () => {
    expect(
      normalizeInstallments(1_000_000, [
        { dueDate: '2026-11-10', amount: 400_000 },
        { dueDate: '2026-10-10', amount: 600_000, accountId: 1000 },
      ]),
    ).toEqual([
      { dueDate: '2026-10-10', amount: 600_000, accountId: 1000, sortOrder: 0 },
      { dueDate: '2026-11-10', amount: 400_000, accountId: null, sortOrder: 1 },
    ]);
  });

  it('оплаты не сошлись с суммой — отказ словами; ноль — тоже', () => {
    expect(() => normalizeInstallments(1_000_000, [{ dueDate: '2026-10-10', amount: 600_000 }])).toThrow(
      'Сумма оплат не сходится с суммой заявки',
    );
    expect(() => normalizeInstallments(0, [{ dueDate: '2026-10-10', amount: 0 }])).toThrow('больше нуля');
    // Копейки не теряются на дробях.
    expect(() => normalizeInstallments(0.3, [{ dueDate: '2026-10-10', amount: 0.1 }, { dueDate: '2026-10-11', amount: 0.2 }])).not.toThrow();
  });

  it('срок заявки — указанный или первая оплата', () => {
    expect(requestDueDate('2026-09-30', [])).toBe('2026-09-30');
    expect(requestDueDate(undefined, [{ dueDate: '2026-11-01', amount: 1 }, { dueDate: '2026-10-01', amount: 1 }])).toBe('2026-10-01');
    expect(() => requestDueDate(undefined, [])).toThrow('Укажите срок');
  });

  it('итоги по каждой валюте, не складывая валюты', () => {
    expect(
      totalsByCurrency([
        { amount: 100, currencyCode: 'RUB' },
        { amount: 50, currencyCode: 'USD' },
        { amount: 25.5, currencyCode: 'RUB' },
      ]),
    ).toEqual([
      { currencyCode: 'RUB', amount: 125.5, count: 2 },
      { currencyCode: 'USD', amount: 50, count: 1 },
    ]);
  });
});
