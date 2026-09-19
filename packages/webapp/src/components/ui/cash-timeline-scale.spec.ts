import { describe, expect, it } from 'vitest';

import { buildTimelineScale } from './cash-timeline-scale';

/**
 * Правила «ленты денег».
 *
 * Главное, что стережётся: ноль всегда в шкале. Без этого лента льстит —
 * и перестаёт отвечать на единственный вопрос, ради которого нарисована.
 */
describe('buildTimelineScale', () => {
  it('НОЛЬ ВСЕГДА В ШКАЛЕ', () => {
    // Подгонка «от минимума до максимума» нарисовала бы падение с 1 000 000
    // до 900 000 обрывом до самого низа. Владелец спрашивает «близко ли к
    // нулю», и шкала обязана отвечать на это.
    const { bars } = buildTimelineScale([
      { date: '2026-09-01', balance: 1_000_000 },
      { date: '2026-09-02', balance: 900_000 },
    ]);

    // Нижний столбик не проседает до нуля высоты: он всё ещё 0,9 от верха.
    expect(bars[1].up).toBeCloseTo(0.9, 5);
    expect(bars[0].up).toBeCloseTo(1, 5);
  });

  it('минус рисуется ВНИЗ от нулевой линии', () => {
    const { bars, zeroLine } = buildTimelineScale([
      { date: '2026-09-01', balance: 100 },
      { date: '2026-09-02', balance: -100 },
    ]);

    expect(bars[0].up).toBeCloseTo(0.5, 5);
    expect(bars[0].down).toBe(0);
    expect(bars[1].down).toBeCloseTo(0.5, 5);
    expect(bars[1].up).toBe(0);
    // Нулевая линия ровно посередине.
    expect(zeroLine).toBeCloseTo(0.5, 5);
  });

  it('все дни в минусе отмечены, а не только первый', () => {
    // Один день без денег и три недели без денег — разные беды.
    const { bars, hasGap } = buildTimelineScale([
      { date: '2026-09-01', balance: 50 },
      { date: '2026-09-02', balance: -10 },
      { date: '2026-09-03', balance: -20 },
    ]);

    expect(hasGap).toBe(true);
    expect(bars.map((b) => b.isGap)).toEqual([false, true, true]);
  });

  it('без минуса ничего не красное', () => {
    const { hasGap, bars } = buildTimelineScale([
      { date: '2026-09-01', balance: 50 },
      { date: '2026-09-02', balance: 70 },
    ]);

    expect(hasGap).toBe(false);
    expect(bars.every((b) => !b.isGap)).toBe(true);
  });

  it('только плюс — нулевая линия по низу', () => {
    const { zeroLine } = buildTimelineScale([
      { date: '2026-09-01', balance: 100 },
      { date: '2026-09-02', balance: 200 },
    ]);

    expect(zeroLine).toBeCloseTo(1, 5);
  });

  it('пустой ряд не роняет расчёт', () => {
    // Лента без данных — это не «лента в ноль», а отсутствие ленты.
    expect(buildTimelineScale([]).bars).toEqual([]);
    expect(buildTimelineScale(null as any).bars).toEqual([]);
  });

  it('все нули — плоская лента, а не деление на ноль', () => {
    const { bars, hasGap } = buildTimelineScale([
      { date: '2026-09-01', balance: 0 },
      { date: '2026-09-02', balance: 0 },
    ]);

    expect(bars.every((b) => b.up === 0 && b.down === 0)).toBe(true);
    expect(hasGap).toBe(false);
  });

  it('мусор в ряду выбрасывается, а не ломает шкалу', () => {
    const { bars } = buildTimelineScale([
      { date: '2026-09-01', balance: 100 },
      { date: '2026-09-02', balance: NaN },
      null as any,
    ]);

    expect(bars).toHaveLength(1);
  });

  it('день разрыва из прогноза отмечается, даже если остаток нулевой', () => {
    // Сервер считает разрывом и ситуацию «ровно ноль на день платежа».
    const { bars } = buildTimelineScale(
      [
        { date: '2026-09-01', balance: 100 },
        { date: '2026-09-02', balance: 0 },
      ],
      '2026-09-02',
    );

    expect(bars[1].isGap).toBe(true);
  });
});
