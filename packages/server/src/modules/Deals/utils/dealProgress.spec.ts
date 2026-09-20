// © 2026 Bigfin
import {
  DIVERGENCE_POINTS,
  MAX_RATIO,
  computeDealProgress,
} from './dealProgress';

/**
 * Прогресс сделки (FIN-024 ТЗ-2).
 *
 * Две колонки в списке сделок отвечают на вопрос «где деньги пришли, а работа
 * не сделана, и наоборот».
 */
describe('прогресс сделки', () => {
  describe('доли', () => {
    it('оплачено — это поступления к сумме сделки', () => {
      const result = computeDealProgress({
        amount: 200_000,
        paid: 50_000,
        shipped: 0,
      });

      expect(result.paidRatio).toBe(25);
    });

    it('отгружено — это акты к сумме сделки', () => {
      const result = computeDealProgress({
        amount: 200_000,
        paid: 0,
        shipped: 100_000,
      });

      expect(result.shippedRatio).toBe(50);
    });

    it('доли печатаются ЦЕЛЫМ процентом', () => {
      // Приёмка 1 FIN-024. «33.3333 %» в узкой колонке таблицы — это шум.
      const result = computeDealProgress({
        amount: 300_000,
        paid: 100_000,
        shipped: 0,
      });

      expect(result.paidRatio).toBe(33);
    });

    it('нулевая сумма сделки — «н/о», а не ноль процентов', () => {
      // Приёмка 2 FIN-024. Ноль означал бы «ничего не оплачено», хотя
      // оплачивать нечего.
      const result = computeDealProgress({ amount: 0, paid: 0, shipped: 0 });

      expect(result.paidRatio).toBeNull();
      expect(result.shippedRatio).toBeNull();
      expect(result.flags).toEqual([]);
    });

    it('доля ограничена сверху', () => {
      // Опечатка в сумме сделки не должна печатать «1 200 000 %» и ломать
      // строку таблицы.
      const result = computeDealProgress({
        amount: 1,
        paid: 1_000_000,
        shipped: 0,
      });

      expect(result.paidRatio).toBe(MAX_RATIO);
    });
  });

  describe('пометки', () => {
    it('работа впереди денег', () => {
      const result = computeDealProgress({
        amount: 100,
        paid: 10,
        shipped: 90,
      });

      expect(result.flags).toContain('work_ahead');
    });

    it('деньги впереди работы', () => {
      const result = computeDealProgress({
        amount: 100,
        paid: 90,
        shipped: 10,
      });

      expect(result.flags).toContain('money_ahead');
    });

    it('появляется СТРОГО больше двадцати пунктов, а не на границе', () => {
      // Приёмка 3 FIN-024. На границе пометка загоралась бы у половины
      // обычных сделок и перестала что-либо значить.
      const onBorder = computeDealProgress({
        amount: 100,
        paid: 10,
        shipped: 10 + DIVERGENCE_POINTS,
      });
      const beyond = computeDealProgress({
        amount: 100,
        paid: 10,
        shipped: 11 + DIVERGENCE_POINTS,
      });

      expect(onBorder.flags).not.toContain('work_ahead');
      expect(beyond.flags).toContain('work_ahead');
    });

    it('переплата названа отдельно', () => {
      const result = computeDealProgress({
        amount: 100,
        paid: 150,
        shipped: 150,
      });

      expect(result.flags).toContain('overpaid');
      expect(result.flags).toContain('overdelivered');
    });

    it('ровная сделка пометок не получает', () => {
      const result = computeDealProgress({
        amount: 100,
        paid: 100,
        shipped: 100,
      });

      expect(result.flags).toEqual([]);
    });
  });
});
