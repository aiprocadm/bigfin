// © 2026 Bigfin
import { findCrookedCurrencyJournals } from './findCrookedCurrencyJournals';

/**
 * Вопрос 28 карты v16 (решение по поручению владельца: показать и дать
 * перепровести по кнопке). До Р1 среза 3 ручная проводка в валюте уходила в
 * журнал БЕЗ умножения на курс: 1000 USD при курсе 80 лежат как 1000 ₽.
 * Дебет с кредитом при этом сходятся — увидеть беду больше нечем.
 *
 * Детектор сравнивает сумму журнала с суммой документа: у кривой проводки
 * журнал совпадает с суммой В ВАЛЮТЕ (один к одному), у правильной — с
 * суммой, умноженной на курс.
 */
const journal = (over: Record<string, any> = {}) => ({
  id: 1,
  journalNumber: 'JE-1',
  date: '2026-05-01',
  amount: 1000,
  currencyCode: 'USD',
  exchangeRate: 80,
  ...over,
});

describe('findCrookedCurrencyJournals', () => {
  it('кривая проводка (журнал 1:1 с валютой) находится', () => {
    const result = findCrookedCurrencyJournals(
      [journal()],
      [{ referenceId: 1, debit: 1000, credit: 0 }, { referenceId: 1, debit: 0, credit: 1000 }],
      'RUB',
    );

    expect(result.journals).toHaveLength(1);
    expect(result.journals[0]).toMatchObject({
      journalId: 1,
      journalNumber: 'JE-1',
      amount: 1000,
      exchangeRate: 80,
      journalTotal: 1000,
      expectedTotal: 80000,
    });
    expect(result.totalJournals).toBe(1);
  });

  it('правильная проводка (журнал умножен на курс) не попадает', () => {
    const result = findCrookedCurrencyJournals(
      [journal()],
      [{ referenceId: 1, debit: 80000, credit: 0 }, { referenceId: 1, debit: 0, credit: 80000 }],
      'RUB',
    );

    expect(result.journals).toHaveLength(0);
  });

  it('проводка в базовой валюте не рассматривается вовсе', () => {
    const result = findCrookedCurrencyJournals(
      [journal({ currencyCode: 'RUB', exchangeRate: 1 })],
      [{ referenceId: 1, debit: 1000, credit: 0 }],
      'RUB',
    );

    expect(result.journals).toHaveLength(0);
  });

  it('курс 1 неотличим от кривого — не трогаем', () => {
    const result = findCrookedCurrencyJournals(
      [journal({ exchangeRate: 1 })],
      [{ referenceId: 1, debit: 1000, credit: 0 }],
      'RUB',
    );

    expect(result.journals).toHaveLength(0);
  });

  it('черновик без строк журнала не попадает', () => {
    const result = findCrookedCurrencyJournals([journal()], [], 'RUB');

    expect(result.journals).toHaveLength(0);
  });

  it('копеечные хвосты не считаются кривизной', () => {
    const result = findCrookedCurrencyJournals(
      [journal()],
      [{ referenceId: 1, debit: 80000.004, credit: 0 }],
      'RUB',
    );

    expect(result.journals).toHaveLength(0);
  });

  it('самые крупные недостачи первыми', () => {
    const result = findCrookedCurrencyJournals(
      [journal(), journal({ id: 2, journalNumber: 'JE-2', amount: 5000 })],
      [
        { referenceId: 1, debit: 1000, credit: 0 },
        { referenceId: 2, debit: 5000, credit: 0 },
      ],
      'RUB',
    );

    expect(result.journals.map((j) => j.journalId)).toEqual([2, 1]);
  });
});
