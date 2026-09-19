// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { shouldShowUnmapped } from './expensesAnalysisView';

/**
 * Остаток Р4 этапа 9: деньги, прошедшие мимо статей.
 *
 * Счёт без статьи молча выпадал из анализа — итог был меньше, чем в ОПиУ,
 * и ничто на это не указывало.
 */
describe('строка «мимо статей»', () => {
  it('показывается, когда мимо статей прошли расходы', () => {
    expect(
      shouldShowUnmapped({ income: 0, expense: 12000, accountsCount: 2 }),
    ).toBe(true);
  });

  it('показывается, когда мимо статей прошли доходы', () => {
    // Недосчитанная выручка обманывает сильнее недосчитанных трат:
    // бизнес выглядит убыточнее, чем есть.
    expect(
      shouldShowUnmapped({ income: 5000, expense: 0, accountsCount: 1 }),
    ).toBe(true);
  });

  it('НЕ показывается, когда мимо статей ничего не прошло', () => {
    // Вечная плашка «всё в порядке» — шум, который перестают читать, а с
    // ним перестают читать и настоящие предупреждения.
    expect(
      shouldShowUnmapped({ income: 0, expense: 0, accountsCount: 0 }),
    ).toBe(false);
  });

  it('НЕ показывается, когда сервер ничего не прислал', () => {
    expect(shouldShowUnmapped(undefined)).toBe(false);
  });

  it('счета без движения сами по себе строку не вызывают', () => {
    // Счётчик может быть ненулевым от прошлой выборки — решает сумма.
    expect(
      shouldShowUnmapped({ income: 0, expense: 0, accountsCount: 7 }),
    ).toBe(false);
  });
});
