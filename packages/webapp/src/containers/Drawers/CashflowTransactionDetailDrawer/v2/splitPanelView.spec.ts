// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  amountFromPercent,
  equalSplit,
  evaluateSplit,
  percentOf,
  suggestedAmount,
} from './splitPanelView';

/**
 * Этап 10 ТЗ. Суммы частей ОБЯЗАНЫ сходиться с операцией: иначе в отчёты
 * уйдёт одна сумма, а в сверку с банком другая, и расхождение будет
 * выглядеть ошибкой банка.
 */
describe('разбиение операции', () => {
  it('части складываются в полную сумму — можно сохранять', () => {
    const state = evaluateSplit(100_000, [
      { amount: 70_000, articleId: 1 },
      { amount: 30_000, articleId: 2 },
    ]);

    expect(state.isValid).toBe(true);
    expect(state.remaining).toBe(0);
  });

  it('не хватает — сохранять нельзя, остаток виден', () => {
    const state = evaluateSplit(100_000, [{ amount: 70_000, articleId: 1 }]);

    expect(state.isValid).toBe(false);
    expect(state.problem).toBe('not_distributed');
    expect(state.remaining).toBe(30_000);
  });

  it('перебор — сохранять нельзя, остаток отрицательный', () => {
    const state = evaluateSplit(100_000, [
      { amount: 70_000, articleId: 1 },
      { amount: 50_000, articleId: 2 },
    ]);

    expect(state.problem).toBe('over_distributed');
    expect(state.remaining).toBe(-20_000);
  });

  it('копейки с плавающей точкой не мешают сойтись', () => {
    // 0.1 + 0.2 даёт 0.30000000000000004. Без округления кнопка сохранения
    // не нажалась бы никогда, и человек не понял бы почему.
    const state = evaluateSplit(0.3, [
      { amount: 0.1, articleId: 1 },
      { amount: 0.2, articleId: 2 },
    ]);

    expect(state.isValid).toBe(true);
  });

  it('часть на ноль не принимается', () => {
    const state = evaluateSplit(100, [
      { amount: 100, articleId: 1 },
      { amount: 0, articleId: 2 },
    ]);

    expect(state.problem).toBe('non_positive_line');
  });

  it('часть без статьи не принимается', () => {
    // Разделение делают ради того, чтобы суммы попали в РАЗНЫЕ статьи.
    const state = evaluateSplit(100, [
      { amount: 60, articleId: 1 },
      { amount: 40, articleId: null },
    ]);

    expect(state.problem).toBe('article_missing');
  });

  it('пустая часть важнее несхождения', () => {
    // Сказать «не хватает 30 000» человеку, который ещё не выбрал статью,
    // — значит подсказать не то.
    const state = evaluateSplit(100, [{ amount: 60, articleId: null }]);

    expect(state.problem).toBe('article_missing');
  });

  it('без частей сохранять нечего', () => {
    expect(evaluateSplit(100, []).problem).toBe('empty');
  });
});

describe('подсказка суммы новой части', () => {
  it('подставляет весь остаток', () => {
    expect(suggestedAmount(30_000)).toBe(30_000);
  });

  it('при переборе подставляет ноль, а не минус', () => {
    // Строка с минусом всё равно не была бы принята.
    expect(suggestedAmount(-5_000)).toBe(0);
  });
});

describe('разбиение в форме операции (FT-023)', () => {
  it('«Поровну»: копейки не теряются, остаток — первой части', () => {
    const parts = equalSplit(100, 3);
    expect(parts).toEqual([33.34, 33.33, 33.33]);
    expect(evaluateSplit(100, parts.map((amount) => ({ amount, articleId: 1 }))).isValid).toBe(true);
    expect(equalSplit(-90, 2)).toEqual([45, 45]);
    expect(equalSplit(100, 0)).toEqual([]);
  });

  it('₽ ↔ %: туда и обратно без дрейфа', () => {
    expect(percentOf(250, 1000)).toBe(25);
    expect(amountFromPercent(25, 1000)).toBe(250);
    expect(amountFromPercent(33.33, 100)).toBe(33.33);
    expect(percentOf(10, 0)).toBe(0);
  });
});

