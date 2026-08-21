import { describe, it, expect } from 'vitest';
import { buildFirstSteps } from './firstSteps';

/**
 * Р4 карты v16 (вопрос 23). Главная новой организации выглядела так же, как
 * у организации с годовым оборотом, — человек не понимал, с чего начать.
 * Чек-лист «первые шаги» считает отметки по НАСТОЯЩИМ данным.
 */
const counts = (over: Partial<Record<string, number>> = {}) => ({
  customers: 0,
  items: 0,
  invoices: 0,
  paymentsReceived: 0,
  userBankAccounts: 0,
  ...over,
});

describe('buildFirstSteps', () => {
  it('пустая организация — пять шагов, все не сделаны', () => {
    const steps = buildFirstSteps(counts());

    expect(steps).toHaveLength(5);
    expect(steps.every((step) => !step.done)).toBe(true);
  });

  it('отметки загораются по настоящим числам', () => {
    const steps = buildFirstSteps(
      counts({ customers: 2, invoices: 1, userBankAccounts: 1 }),
    );
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s.done]));

    expect(byKey).toEqual({
      customer: true,
      item: false,
      invoice: true,
      payment: false,
      bank: true,
    });
  });

  it('у каждого шага есть адрес, куда идти', () => {
    for (const step of buildFirstSteps(counts())) {
      expect(step.href.startsWith('/')).toBe(true);
    }
  });

  it('порядок шагов — путь первой сделки: контрагент → товар → счёт → оплата → банк', () => {
    expect(buildFirstSteps(counts()).map((s) => s.key)).toEqual([
      'customer',
      'item',
      'invoice',
      'payment',
      'bank',
    ]);
  });
});
