// © 2026 Bigfin
import { estimateSimplifiedTax } from '@/modules/Dashboard/queries/estimateSimplifiedTax';
import { estimateTaxByAccounts } from './estimateTaxByAccounts';

/**
 * FT-070 ТЗ-3: налог по режимам счетов.
 *
 * Главное здесь — приёмка («два счёта с разными режимами: оценка по каждому
 * отдельно и сумма») и обратная совместимость: пока режимов у счетов нет,
 * ответ совпадает с прежним расчётом по организации до копейки.
 */
const TODAY = '2026-05-15';

describe('оценка налога по счетам', () => {
  it('приёмка: два счёта с разными режимами считаются отдельно и складываются', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'USN_INCOME',
      accounts: [
        { accountId: 1, regime: 'USN_INCOME', income: 100_000, expenses: 40_000 },
        { accountId: 2, regime: 'USN_INCOME_EXPENSE', income: 200_000, expenses: 120_000 },
      ],
      today: TODAY,
    });

    // Счёт 1: 6 % от дохода = 6 000. Счёт 2: 15 % от (200 000 − 120 000) = 12 000.
    expect(result?.parts.filter((p) => p.accountId !== null)).toEqual([
      expect.objectContaining({ accountId: 1, amount: 6000, ratePercent: 6, base: 100_000 }),
      expect.objectContaining({ accountId: 2, amount: 12000, ratePercent: 15, base: 80_000 }),
    ]);
    expect(result?.amount).toBe(18000);
    // Одна ставка на разные режимы соврала бы — показываем среднюю.
    expect(result?.ratePercent).toBe(10);
    expect(result?.fromDate).toBe('2026-04-01');
    expect(result?.toDate).toBe('2026-06-30');
    expect(result?.dueDate).toBe('2026-07-28');
  });

  it('без режимов у счетов — ровно прежний расчёт по организации', () => {
    const accounts = [
      { accountId: 1, regime: null, income: 70_000, expenses: 10_000 },
      { accountId: 2, regime: null, income: 30_000, expenses: 5_000 },
    ];
    const result = estimateTaxByAccounts({
      orgRegime: 'USN_INCOME_EXPENSE',
      orgCustomRatePercent: 5,
      accounts,
      today: TODAY,
    });
    const before = estimateSimplifiedTax({
      regime: 'USN_INCOME_EXPENSE',
      income: 100_000,
      expenses: 15_000,
      today: TODAY,
      customRatePercent: 5,
    });

    expect(result).toEqual({ ...before, parts: [expect.objectContaining({ accountId: null })] });
    expect(result?.amount).toBe(4250);
  });

  it('счета без режима идут одной корзиной по режиму организации', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'USN_INCOME',
      accounts: [
        { accountId: 1, regime: null, income: 50_000, expenses: 0 },
        { accountId: 2, regime: null, income: 50_000, expenses: 0 },
        { accountId: 3, regime: 'NPD', income: 10_000, expenses: 0 },
      ],
      today: TODAY,
    });

    expect(result?.parts).toEqual([
      expect.objectContaining({ accountId: null, amount: 6000 }),
      // Самозанятость: 6 % — большая из двух ставок, чтобы не недоложить.
      expect.objectContaining({ accountId: 3, amount: 600, ratePercent: 6 }),
    ]);
    expect(result?.amount).toBe(6600);
    // Ставка у всех частей одна — её и показываем.
    expect(result?.ratePercent).toBe(6);
  });

  it('льготная ставка организации ложится только на счёт того же режима', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'USN_INCOME',
      orgCustomRatePercent: 1,
      accounts: [
        { accountId: 1, regime: 'USN_INCOME', income: 100_000, expenses: 0 },
        { accountId: 2, regime: 'USN_INCOME_EXPENSE', income: 100_000, expenses: 0 },
      ],
      today: TODAY,
    });

    expect(result?.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: 1, ratePercent: 1, amount: 1000 }),
        expect.objectContaining({ accountId: 2, ratePercent: 15, amount: 15000 }),
      ]),
    );
  });

  it('упрощёнка с НДС 5 %: НДС выделяется из поступлений и в доход не идёт', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'USN_INCOME',
      accounts: [{ accountId: 1, regime: 'USN_VAT_5', income: 105_000, expenses: 0 }],
      today: TODAY,
    });
    const part = result?.parts.find((p) => p.accountId === 1);

    // НДС = 105 000 × 5 / 105 = 5 000; упрощёнка 6 % от 100 000 = 6 000.
    expect(part).toEqual(
      expect.objectContaining({ vatAmount: 5000, vatPercent: 5, base: 100_000, amount: 11000 }),
    );
  });

  it('упрощёнка с НДС 20 %: входной НДС из расходов уменьшает налог', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'USN_INCOME_EXPENSE',
      accounts: [{ accountId: 1, regime: 'USN_VAT_20', income: 120_000, expenses: 60_000 }],
      today: TODAY,
    });
    const part = result?.parts.find((p) => p.accountId === 1);

    // НДС = 20 000 − 10 000 = 10 000; упрощёнка организации «доходы минус
    // расходы»: 15 % от (100 000 − 50 000) = 7 500.
    expect(part).toEqual(
      expect.objectContaining({ vatAmount: 10000, base: 50_000, amount: 17500 }),
    );
  });

  it('ОСНО и патент в оценку не попадают; если больше ничего нет — оценки нет', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'OSNO',
      accounts: [
        { accountId: 1, regime: 'OSNO', income: 100_000, expenses: 0 },
        { accountId: 2, regime: 'PSN', income: 100_000, expenses: 0 },
        { accountId: 3, regime: null, income: 100_000, expenses: 0 },
      ],
      today: TODAY,
    });

    expect(result).toBeNull();
  });

  it('счёт со своим режимом считается и у организации на общей системе', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'OSNO',
      accounts: [
        { accountId: 1, regime: null, income: 500_000, expenses: 0 },
        { accountId: 2, regime: 'AUSN', income: 100_000, expenses: 0 },
      ],
      today: TODAY,
    });

    expect(result?.parts).toEqual([
      expect.objectContaining({ accountId: 2, amount: 8000, ratePercent: 8 }),
    ]);
    expect(result?.amount).toBe(8000);
  });

  it('расход больше дохода — к уплате ноль, а не минус', () => {
    const result = estimateTaxByAccounts({
      orgRegime: 'USN_INCOME',
      accounts: [
        { accountId: 1, regime: 'USN_INCOME_EXPENSE', income: 50_000, expenses: 80_000 },
      ],
      today: TODAY,
    });

    expect(result?.parts.find((p) => p.accountId === 1)?.amount).toBe(0);
  });
});
