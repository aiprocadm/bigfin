// © 2026 Bigfin
import {
  INTERCOMPANY_SETTLEMENT_ACCOUNT_ID,
  needsSettlementLine,
  settlementBalance,
  settlementEntry,
} from './intercompanySettlement';

/**
 * Расчёты внутри группы (остаток К9).
 *
 * Правило простое, но ошибка в нём молчаливая: знак, перепутанный местами,
 * даёт баланс, который СХОДИТСЯ, но показывает долг не в ту сторону. Поэтому
 * проверяется не только «сошлось», но и «в какую сторону».
 */
describe('расчёты внутри группы', () => {
  describe('когда строка нужна', () => {
    it('в режиме всех юрлиц строки нет', () => {
      // Обе ноги перевода уже внутри отчёта — перекоса нет.
      expect(needsSettlementLine([])).toBe(false);
      expect(needsSettlementLine(null)).toBe(false);
      expect(needsSettlementLine(undefined)).toBe(false);
    });

    it('при одном выбранном юрлице строка нужна', () => {
      expect(needsSettlementLine([1])).toBe(true);
    });

    it('при части группы строка тоже нужна', () => {
      // Два юрлица из трёх — это всё ещё не вся группа: у выбранной части
      // есть настоящие требования к оставшейся.
      expect(needsSettlementLine([1, 2])).toBe(true);
    });
  });

  describe('сторона долга', () => {
    it('отдал своим — нам должны, остаток положительный', () => {
      // ООО перевело 500 000: в его отбор попала только нога «кредит».
      const net = { debit: 0, credit: 500_000 };

      expect(settlementBalance(net)).toBe(500_000);
    });

    it('получил от своих — мы должны, остаток отрицательный', () => {
      const net = { debit: 500_000, credit: 0 };

      expect(settlementBalance(net)).toBe(-500_000);
    });

    it('две стороны группы в сумме дают ноль', () => {
      const giver = settlementBalance({ debit: 0, credit: 500_000 });
      const taker = settlementBalance({ debit: 500_000, credit: 0 });

      expect(giver + taker).toBe(0);
    });
  });

  describe('сама проводка', () => {
    it('дебет и кредит меняются местами', () => {
      // Так знак получается сам, и в проводке не появляется отрицательных
      // чисел — база их и не ждёт.
      expect(settlementEntry({ debit: 700, credit: 0 })).toEqual({
        debit: 0,
        credit: 700,
      });
    });

    it('пустые значения не превращаются в NaN', () => {
      expect(
        settlementEntry({ debit: undefined as any, credit: null as any }),
      ).toEqual({ debit: 0, credit: 0 });
    });
  });

  describe('номер вычисляемого счёта', () => {
    it('отрицательный — не столкнётся с настоящим счётом', () => {
      // Номера настоящих счетов выдаёт база, они всегда положительные.
      expect(INTERCOMPANY_SETTLEMENT_ACCOUNT_ID).toBeLessThan(0);
    });
  });

  describe('главное свойство: баланс сходится', () => {
    it('перекос отбора гасится строкой ровно в ноль', () => {
      // Отчёт по ООО видит: касса −500 000 (кредит) и всё прочее сошлось.
      const scopeNet = { debit: 1_000_000, credit: 1_500_000 };
      const imbalance = scopeNet.debit - scopeNet.credit;

      expect(imbalance).toBe(-500_000);
      expect(imbalance + settlementBalance(scopeNet)).toBe(0);
    });

    it('сошедшийся отбор строку не двигает', () => {
      const scopeNet = { debit: 1_000_000, credit: 1_000_000 };

      expect(settlementBalance(scopeNet)).toBe(0);
    });
  });
});
