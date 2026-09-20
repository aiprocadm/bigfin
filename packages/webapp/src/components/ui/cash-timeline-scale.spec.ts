import { describe, expect, it } from 'vitest';

import { buildTimelineGeometry } from './cash-timeline-scale';

/**
 * Геометрия ленты денег.
 *
 * ПРАВИЛО ИЗМЕНИЛОСЬ ПОСЛЕ ЖИВОГО ПРОХОДА. Раньше здесь проверялось «ноль
 * всегда в шкале» — правило, написанное для СТОЛБИКОВ: столбик меряется
 * длиной от нуля, и обрезанная шкала врёт о пропорции.
 *
 * Но фигура была выбрана неверно. Вопрос владельца — «как меняется остаток»,
 * а это изменение во времени, то есть ЛИНИЯ. На стенде остаток за месяц падал
 * на 101 250 ₽, а лента рисовала ровную серую стену: при остатке в 1,7 млн
 * разница в 6 % давала 6 точек высоты.
 *
 * Линия кодирует положение, а не длину, и честно строится по размаху данных —
 * при двух условиях, которые и проверяются ниже: ноль входит в шкалу, как
 * только прогноз уходит в минус, а концы пути подписаны числами.
 */
describe('геометрия ленты денег', () => {
  describe('пустые и вырожденные случаи', () => {
    it('без точек ленты нет', () => {
      const geometry = buildTimelineGeometry([]);

      expect(geometry.path).toEqual([]);
      expect(geometry.hasGap).toBe(false);
    });

    it('мусорные точки отбрасываются, а не роняют расчёт', () => {
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 100 },
        { date: '2026-01-02', balance: Number.NaN },
        null as any,
      ]);

      expect(geometry.path).toHaveLength(1);
    });

    it('ровный прогноз — это ОТВЕТ, а не деление на ноль', () => {
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 500 },
        { date: '2026-01-02', balance: 500 },
      ]);

      expect(geometry.isFlat).toBe(true);
      // Прямая посередине, а не NaN и не схлопнутая в край линия.
      geometry.path.forEach((p) => {
        expect(Number.isFinite(p.y)).toBe(true);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(1);
      });
    });
  });

  describe('движение видно', () => {
    it('падение на 6 % от большого остатка РИСУЕТСЯ', () => {
      // Ровно случай со стенда: 1 749 839 → 1 648 589. Прежняя шкала от нуля
      // давала разницу в 6 точек из 96 — стену одинаковых столбиков.
      const geometry = buildTimelineGeometry([
        { date: '2026-09-20', balance: 1_749_839 },
        { date: '2026-10-20', balance: 1_648_589 },
      ]);

      const [first, last] = geometry.path;

      // Разница по высоте — заметная доля поля, а не пара точек.
      expect(Math.abs(last.y - first.y)).toBeGreaterThan(0.5);
    });

    it('верх и низ пути лежат внутри поля, а не на самом краю', () => {
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 300 },
        { date: '2026-01-02', balance: 100 },
      ]);

      geometry.path.forEach((p) => {
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(1);
      });
    });

    it('точки идут слева направо по порядку дней', () => {
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 1 },
        { date: '2026-01-02', balance: 2 },
        { date: '2026-01-03', balance: 3 },
      ]);

      expect(geometry.path.map((p) => p.x)).toEqual([0, 0.5, 1]);
    });
  });

  describe('ноль и разрыв', () => {
    it('благополучный прогноз НЕ рисует линию нуля', () => {
      // Горизонталь посреди благополучного прогноза ничего не говорит.
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 900_000 },
        { date: '2026-01-02', balance: 800_000 },
      ]);

      expect(geometry.zeroLine).toBeNull();
      expect(geometry.hasGap).toBe(false);
    });

    it('уход в минус ОБЯЗАТЕЛЬНО вводит ноль в шкалу', () => {
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 50_000 },
        { date: '2026-01-02', balance: -20_000 },
      ]);

      expect(geometry.hasGap).toBe(true);
      expect(geometry.zeroLine).not.toBeNull();
      expect(geometry.zeroLine as number).toBeGreaterThan(0);
      expect(geometry.zeroLine as number).toBeLessThan(1);
    });

    it('день в минусе лежит НИЖЕ нулевой линии', () => {
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 50_000 },
        { date: '2026-01-02', balance: -20_000 },
      ]);

      const zero = geometry.zeroLine as number;
      const [plus, minus] = geometry.path;

      expect(plus.y).toBeLessThan(zero);
      expect(minus.y).toBeGreaterThan(zero);
    });
  });

  describe('концы пути подписываются числами', () => {
    it('начало и конец отдаются отдельно', () => {
      // Без подписей падение на 6 % и падение на 99 % выглядят одинаково —
      // оба «линия вниз».
      const geometry = buildTimelineGeometry([
        { date: '2026-01-01', balance: 1_000_000 },
        { date: '2026-01-02', balance: 900_000 },
        { date: '2026-01-03', balance: 850_000 },
      ]);

      expect(geometry.first).toBe(1_000_000);
      expect(geometry.last).toBe(850_000);
    });
  });
});
