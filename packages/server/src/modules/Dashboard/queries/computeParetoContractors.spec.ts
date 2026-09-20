// © 2026 Bigfin
import {
  PARETO_TOP,
  computeParetoContractors,
} from './computeParetoContractors';

/**
 * Парето по контрагентам (FIN-018 ТЗ-2).
 *
 * Блок отвечает на вопрос «на ком держится бизнес». Ошибка здесь обманывает
 * в самом важном: человек решит, что зависимости нет, и не станет искать
 * новых клиентов.
 */
const contractor = (contactId: number, revenue: number) => ({
  contactId,
  name: `Контрагент ${contactId}`,
  revenue,
});

describe('парето по контрагентам', () => {
  describe('состав строк', () => {
    it('сумма строк равна выручке за период', () => {
      // Приёмка 1 FIN-018: иначе график и отчёт разойдутся.
      const result = computeParetoContractors([
        contractor(1, 500),
        contractor(2, 300),
        contractor(3, 200),
      ]);
      const sum = result.rows.reduce((acc, row) => acc + row.revenue, 0);

      expect(sum).toBe(result.totalRevenue);
      expect(result.totalRevenue).toBe(1000);
    });

    it('сверх десяти контрагентов сворачиваются в «Остальные»', () => {
      const many = Array.from({ length: 14 }, (_, index) =>
        contractor(index + 1, 100 - index),
      );
      const result = computeParetoContractors(many);

      expect(result.rows).toHaveLength(PARETO_TOP + 1);
      expect(result.rows[result.rows.length - 1].isRest).toBe(true);
    });

    it('сумма топа и «Остальных» равна выручке', () => {
      const many = Array.from({ length: 14 }, (_, index) =>
        contractor(index + 1, 100 - index),
      );
      const result = computeParetoContractors(many);
      const sum = result.rows.reduce((acc, row) => acc + row.revenue, 0);

      expect(sum).toBe(result.totalRevenue);
    });

    it('строки идут по убыванию выручки', () => {
      const result = computeParetoContractors([
        contractor(1, 100),
        contractor(2, 900),
        contractor(3, 500),
      ]);

      expect(result.rows.map((row) => row.contactId)).toEqual([2, 3, 1]);
    });

    it('контрагенты без выручки за период не показываются', () => {
      const result = computeParetoContractors([
        contractor(1, 100),
        contractor(2, 0),
      ]);

      expect(result.rows).toHaveLength(1);
    });
  });

  describe('накопительная доля', () => {
    it('доходит РОВНО до ста процентов', () => {
      // Накопление через сложение округлённых долей даёт 99,99 — и человек
      // видит, что «чего-то не хватает». Ряд закрывается честной сотней.
      const result = computeParetoContractors([
        contractor(1, 1),
        contractor(2, 1),
        contractor(3, 1),
      ]);
      const last = result.rows[result.rows.length - 1];

      expect(last.cumulativePercent).toBe(100);
    });

    it('растёт, а не скачет', () => {
      const result = computeParetoContractors([
        contractor(1, 500),
        contractor(2, 300),
        contractor(3, 200),
      ]);
      const values = result.rows.map((row) => row.cumulativePercent);

      expect(values[0]).toBe(50);
      expect(values[1]).toBe(80);
      expect(values[2]).toBe(100);
    });
  });

  describe('вывод словами', () => {
    it('три клиента на 80 % — ВЫСОКАЯ ЗАВИСИМОСТЬ', () => {
      const result = computeParetoContractors([
        contractor(1, 400),
        contractor(2, 300),
        contractor(3, 150),
        contractor(4, 50),
        contractor(5, 50),
        contractor(6, 50),
      ]);

      expect(result.concentrationCount).toBe(3);
      expect(result.verdict).toBe('HIGH_DEPENDENCE');
    });

    it('выручка размазана по многим — «равномерно»', () => {
      const many = Array.from({ length: 20 }, (_, index) =>
        contractor(index + 1, 100),
      );
      const result = computeParetoContractors(many);

      expect(result.concentrationCount).toBe(16);
      expect(result.verdict).toBe('EVEN');
    });

    it('единственный клиент назван отдельно', () => {
      // «Более 80 % даёт 1 клиент» звучит как статистика; «вся выручка от
      // одного клиента» — как предупреждение, которым это и является.
      const result = computeParetoContractors([contractor(1, 1000)]);

      expect(result.verdict).toBe('SINGLE_CLIENT');
    });

    it('середина — факт без оценки', () => {
      // Оценка там, где её не просят, читается как упрёк.
      const result = computeParetoContractors(
        Array.from({ length: 10 }, (_, index) =>
          contractor(index + 1, index < 5 ? 160 : 40),
        ),
      );

      expect(result.verdict).toBe('MODERATE');
    });
  });

  describe('нулевая выручка', () => {
    it('блок не показывается вовсе', () => {
      // Пустой график с подписью «0 %» выглядит поломкой, а не ответом
      // «продаж за период не было».
      const result = computeParetoContractors([]);

      expect(result.rows).toEqual([]);
      expect(result.verdict).toBeNull();
      expect(result.concentrationCount).toBeNull();
    });

    it('только нулевые контрагенты — то же самое', () => {
      const result = computeParetoContractors([contractor(1, 0)]);

      expect(result.rows).toEqual([]);
      expect(result.verdict).toBeNull();
    });
  });
});
