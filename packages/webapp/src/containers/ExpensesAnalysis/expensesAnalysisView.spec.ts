// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  buildSplitRows,
  chartablePoints,
  expensesWarning,
  isMetricShown,
  type ExpensesSplit,
} from './expensesAnalysisView';

const split = (over: Partial<ExpensesSplit> = {}): ExpensesSplit => ({
  fixed: 400,
  variable: 600,
  unset: 0,
  total: 1000,
  fixedShare: 0.4,
  variableShare: 0.6,
  unsetShare: 0,
  unsetArticles: 0,
  ...over,
});

describe('buildSplitRows', () => {
  it('всегда показывает постоянные и переменные', () => {
    // Их ноль осмыслен: «постоянных расходов не было».
    const rows = buildSplitRows(split({ fixed: 0, fixedShare: 0 }));

    expect(rows.map((row) => row.key)).toEqual(['fixed', 'variable']);
  });

  it('корзина «не размечено» показывается, только когда в ней что-то есть', () => {
    // У аккуратной фирмы лишняя нулевая строка намекала бы на проблему,
    // которой нет.
    expect(buildSplitRows(split()).map((r) => r.key)).toEqual([
      'fixed',
      'variable',
    ]);

    expect(
      buildSplitRows(split({ unset: 200, unsetShare: 0.2 })).map((r) => r.key),
    ).toEqual(['fixed', 'variable', 'unset']);
  });

  it('без данных строк нет', () => {
    expect(buildSplitRows(undefined)).toEqual([]);
  });
});

describe('expensesWarning — о чём предупредить', () => {
  it('нет ни одной постоянной статьи — самое важное предупреждение', () => {
    // Без постоянных затрат точка безубыточности вырождается, и показывать
    // её как готовый ответ нельзя.
    expect(expensesWarning(split(), false)).toBe('no_fixed');
  });

  it('часть расходов не размечена — числа занижены', () => {
    expect(
      expensesWarning(split({ unset: 300, unsetArticles: 2 }), true),
    ).toBe('partly_unmarked');
  });

  it('«постоянных нет» важнее, чем «часть не размечена»', () => {
    // Иначе человек увидел бы мягкое предупреждение вместо жёсткого.
    expect(
      expensesWarning(split({ unset: 300, unsetArticles: 2 }), false),
    ).toBe('no_fixed');
  });

  it('всё размечено — предупреждать не о чем', () => {
    expect(expensesWarning(split(), true)).toBeNull();
  });

  it('без расходов вовсе предупреждения не показываются', () => {
    // Пустой период — это не «плохо размечено», это просто пусто.
    expect(expensesWarning(split({ total: 0 }), false)).toBeNull();
    expect(expensesWarning(undefined, false)).toBeNull();
  });
});

describe('isMetricShown', () => {
  it('неприменимая метрика не показывается числом', () => {
    // «Запас прочности 0%» читается как «на грани», а означает
    // «посчитать нельзя».
    expect(isMetricShown({ value: 0, applicable: false })).toBe(false);
  });

  it('применимая метрика показывается, даже если она ноль', () => {
    expect(isMetricShown({ value: 0, applicable: true })).toBe(true);
  });

  it('отсутствие метрики не роняет экран', () => {
    expect(isMetricShown(undefined)).toBe(false);
  });
});

describe('chartablePoints', () => {
  it('месяц без выручки в линию не идёт', () => {
    // Провести линию через ноль значило бы нарисовать «расходы упали
    // до нуля», хотя они были.
    const points = chartablePoints([
      { month: '2026-01', share: 0.7 },
      { month: '2026-02', share: null },
      { month: '2026-03', share: 0.6 },
    ]);

    expect(points.map((p) => p.month)).toEqual(['2026-01', '2026-03']);
  });

  it('нулевая доля — настоящее значение и остаётся', () => {
    const points = chartablePoints([{ month: '2026-01', share: 0 }]);

    expect(points.length).toBe(1);
  });

  it('пустые данные не роняют экран', () => {
    expect(chartablePoints(undefined)).toEqual([]);
  });
});
