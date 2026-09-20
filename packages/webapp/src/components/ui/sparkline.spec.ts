import { describe, expect, it } from 'vitest';

import { buildSparklineGeometry, SparklinePoint } from './sparkline';

/**
 * Геометрия тренда (FIN-016 ТЗ-2).
 *
 * Тренд рисуется В КАЖДОЙ строке отчёта — их бывает триста. Поэтому проверять
 * надо не «красиво ли», а четыре случая, на которых такая мелочь обычно и
 * врёт: одно значение, сплошные нули, отрицательные суммы и пропуски.
 */
const at = (...values: Array<number | null>): SparklinePoint[] =>
  values.map((value, index) => ({ label: `п${index + 1}`, value }));

describe('геометрия тренда', () => {
  describe('когда рисовать нечего', () => {
    it('строка с ОДНИМ значением тренда не получает', () => {
      // Одна точка — это не изменение во времени. Нарисовав её линией, мы
      // сказали бы «тренд ровный», чего из одного числа не следует.
      expect(buildSparklineGeometry(at(100))).toBeNull();
    });

    it('пустой список тренда не получает', () => {
      expect(buildSparklineGeometry([])).toBeNull();
    });

    it('одно значение среди пропусков тренда не получает', () => {
      expect(buildSparklineGeometry(at(null, 100, null))).toBeNull();
    });

    it('мусор вместо числа считается пропуском, а не роняет расчёт', () => {
      const geometry = buildSparklineGeometry([
        { label: 'п1', value: Number.NaN },
        { label: 'п2', value: 10 },
        { label: 'п3', value: 20 },
      ]);

      expect(geometry).not.toBeNull();
      expect(geometry!.segments).toHaveLength(1);
      expect(geometry!.segments[0]).toHaveLength(2);
    });
  });

  describe('ВСЕ НУЛИ — это ответ, а не отсутствие данных', () => {
    const geometry = buildSparklineGeometry(at(0, 0, 0, 0))!;

    it('линия рисуется, а не пропадает', () => {
      expect(geometry).not.toBeNull();
      expect(geometry.segments[0]).toHaveLength(4);
    });

    it('идёт ровно посередине и не делится на ноль', () => {
      expect(geometry.isFlat).toBe(true);
      geometry.segments[0].forEach((vertex) => {
        expect(Number.isFinite(vertex.y)).toBe(true);
        expect(vertex.y).toBeCloseTo(0.5, 5);
      });
    });

    it('минимум и максимум — ноль, а не пусто', () => {
      expect(geometry.min.value).toBe(0);
      expect(geometry.max.value).toBe(0);
    });
  });

  describe('ОТРИЦАТЕЛЬНЫЕ значения', () => {
    const geometry = buildSparklineGeometry(at(-500, -100, -900))!;

    it('минимум и максимум берутся по величине, а не по модулю', () => {
      expect(geometry.min.value).toBe(-900);
      expect(geometry.max.value).toBe(-100);
    });

    it('чем меньше значение, тем НИЖЕ точка', () => {
      const [first, second, third] = geometry.segments[0];

      expect(second.y).toBeLessThan(first.y); // -100 выше, чем -500
      expect(third.y).toBeGreaterThan(first.y); // -900 ниже, чем -500
    });

    it('переход через ноль не рвёт линию и не рисует нулевую черту', () => {
      const crossing = buildSparklineGeometry(at(-50, 0, 50))!;

      expect(crossing.segments).toHaveLength(1);
      expect(crossing.segments[0]).toHaveLength(3);
      expect(crossing.min.value).toBe(-50);
      expect(crossing.max.value).toBe(50);
    });
  });

  describe('ПРОПУСКИ', () => {
    it('пропуск РАЗРЫВАЕТ линию, а не соединяется через него', () => {
      // Соединив, мы нарисовали бы движение, которого в данных нет.
      const geometry = buildSparklineGeometry(at(10, 20, null, 40, 50))!;

      expect(geometry.segments).toHaveLength(2);
      expect(geometry.segments[0].map((v) => v.index)).toEqual([0, 1]);
      expect(geometry.segments[1].map((v) => v.index)).toEqual([3, 4]);
    });

    it('пропуск НЕ сдвигает время: место периода остаётся за ним', () => {
      const geometry = buildSparklineGeometry(at(10, null, null, 40))!;
      const positions = geometry.segments.flat();

      expect(positions[0].x).toBeCloseTo(0, 5);
      expect(positions[1].x).toBeCloseTo(1, 5);
    });

    it('ноль — НЕ пропуск: линия через него идёт сплошной', () => {
      const geometry = buildSparklineGeometry(at(10, 0, 30))!;

      expect(geometry.segments).toHaveLength(1);
      expect(geometry.segments[0]).toHaveLength(3);
      expect(geometry.min.value).toBe(0);
    });
  });

  describe('подсказка называет ПЕРИОДЫ, а не номера', () => {
    it('минимум и максимум помнят свою подпись', () => {
      const geometry = buildSparklineGeometry([
        { label: 'май', value: 4383887 },
        { label: 'июнь', value: 1244516 },
        { label: 'июль', value: 2000000 },
      ])!;

      expect(geometry.min).toEqual({
        label: 'июнь',
        value: 1244516,
        index: 1,
      });
      expect(geometry.max).toEqual({ label: 'май', value: 4383887, index: 0 });
    });

    it('из одинаковых крайних берётся ПЕРВЫЙ период', () => {
      // Иначе подсказка называла бы не тот месяц, когда значение стало таким.
      const geometry = buildSparklineGeometry([
        { label: 'май', value: 100 },
        { label: 'июнь', value: 50 },
        { label: 'июль', value: 100 },
      ])!;

      expect(geometry.max.label).toBe('май');
    });
  });

  it('точки укладываются в поле 0..1 с полем по краям', () => {
    const geometry = buildSparklineGeometry(at(10, 90))!;

    geometry.segments.flat().forEach((vertex) => {
      expect(vertex.x).toBeGreaterThanOrEqual(0);
      expect(vertex.x).toBeLessThanOrEqual(1);
      expect(vertex.y).toBeGreaterThan(0);
      expect(vertex.y).toBeLessThan(1);
    });
  });
});
