// © 2026 Bigfin
import {
  DIRECTIONS_TOP,
  computeDirectionsProfit,
} from './computeDirectionsProfit';

/**
 * Прибыльность направлений (FIN-018 ТЗ-2).
 *
 * Блок отвечает на вопрос «что из этого стоит делать дальше». Ошибка здесь
 * стоит дорого: человек закроет прибыльное направление или будет кормить
 * убыточное.
 */
const direction = (id: number, revenue: number, costs: number) => ({
  projectId: id,
  name: `Направление ${id}`,
  revenue,
  costs,
});

describe('прибыльность направлений', () => {
  describe('расчёт строки', () => {
    it('прибыль — это выручка минус расходы', () => {
      const result = computeDirectionsProfit([direction(1, 1000, 400)]);

      expect(result.rows[0].profit).toBe(600);
    });

    it('рентабельность — доля прибыли в выручке', () => {
      const result = computeDirectionsProfit([direction(1, 1000, 400)]);

      expect(result.rows[0].marginPercent).toBe(60);
    });

    it('без выручки рентабельность НЕ СЧИТАЕТСЯ', () => {
      // Делить не на что. Ноль вместо «н/о» — это выдуманное число, по
      // которому человек примет решение.
      const result = computeDirectionsProfit([direction(1, 0, 500)]);

      expect(result.rows[0].marginPercent).toBeNull();
    });

    it('убыток помечен отдельно', () => {
      const result = computeDirectionsProfit([direction(1, 100, 300)]);

      expect(result.rows[0].profit).toBe(-200);
      expect(result.rows[0].isLoss).toBe(true);
    });

    it('прибыльное направление пометки не получает', () => {
      const result = computeDirectionsProfit([direction(1, 300, 100)]);

      expect(result.rows[0].isLoss).toBe(false);
    });
  });

  describe('порядок', () => {
    it('по умолчанию — по прибыли, от большей к меньшей', () => {
      const result = computeDirectionsProfit([
        direction(1, 1000, 900),
        direction(2, 1000, 100),
        direction(3, 1000, 500),
      ]);

      expect(result.rows.map((row) => row.projectId)).toEqual([2, 3, 1]);
    });

    it('по рентабельности порядок ДРУГОЙ', () => {
      // Большое направление может давать много денег при плохой отдаче.
      // Переключатель для того и нужен: это два разных вопроса.
      const rows = [
        direction(1, 10_000, 9_000), // прибыль 1000, рентабельность 10 %
        direction(2, 1_000, 500), //    прибыль 500,  рентабельность 50 %
      ];

      expect(
        computeDirectionsProfit(rows, 'profit').rows.map((r) => r.projectId),
      ).toEqual([1, 2]);
      expect(
        computeDirectionsProfit(rows, 'margin').rows.map((r) => r.projectId),
      ).toEqual([2, 1]);
    });

    it('направление без выручки не всплывает наверх по рентабельности', () => {
      // «Н/о» — это неизвестность, а не бесконечность.
      const result = computeDirectionsProfit(
        [direction(1, 0, 100), direction(2, 1000, 500)],
        'margin',
      );

      expect(result.rows[0].projectId).toBe(2);
    });

    it('показываем не больше восьми', () => {
      const many = Array.from({ length: 12 }, (_, index) =>
        direction(index + 1, 1000, index * 10),
      );
      const result = computeDirectionsProfit(many);

      expect(result.rows).toHaveLength(DIRECTIONS_TOP);
    });
  });

  describe('что не показываем', () => {
    it('направление без движения за период пропускается', () => {
      const result = computeDirectionsProfit([
        direction(1, 0, 0),
        direction(2, 100, 50),
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].projectId).toBe(2);
    });

    it('направлений нет — блока нет', () => {
      // Пустой блок предлагает человеку то, чем он не пользуется.
      expect(computeDirectionsProfit([]).rows).toEqual([]);
      expect(computeDirectionsProfit().rows).toEqual([]);
    });
  });

  describe('операции без направления', () => {
    it('выносятся отдельной строкой, а не теряются', () => {
      // Если их молча выбросить, сумма блока не сойдётся с ОПиУ, и человек
      // решит, что где-то ошибка. Она и будет — здесь.
      const result = computeDirectionsProfit([
        direction(1, 1000, 400),
        { projectId: null, name: '', revenue: 200, costs: 700 },
      ]);

      expect(result.rows.map((row) => row.projectId)).toEqual([1]);
      expect(result.unassigned?.profit).toBe(-500);
    });

    it('без таких операций строки нет', () => {
      const result = computeDirectionsProfit([direction(1, 1000, 400)]);

      expect(result.unassigned).toBeNull();
    });
  });
});
