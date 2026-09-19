// © 2026 Bigfin
import {
  INTERCOMPANY_PAYABLE_ACCOUNT_ID,
  INTERCOMPANY_RECEIVABLE_ACCOUNT_ID,
  isSettlementAccountId,
  needsSettlementLine,
  settlementAccountSide,
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

  describe('номера вычисляемых строк', () => {
    it('отрицательные — не столкнутся с настоящим счётом', () => {
      // Номера настоящих счетов выдаёт база, они всегда положительные.
      expect(INTERCOMPANY_RECEIVABLE_ACCOUNT_ID).toBeLessThan(0);
      expect(INTERCOMPANY_PAYABLE_ACCOUNT_ID).toBeLessThan(0);
    });

    it('две стороны — разные номера', () => {
      // Один номер на обе означал бы, что долг и требование складываются в
      // одну строку и гасят друг друга.
      expect(INTERCOMPANY_RECEIVABLE_ACCOUNT_ID).not.toBe(
        INTERCOMPANY_PAYABLE_ACCOUNT_ID,
      );
    });

    it('настоящий счёт строкой расчётов не считается', () => {
      expect(isSettlementAccountId(INTERCOMPANY_PAYABLE_ACCOUNT_ID)).toBe(true);
      expect(isSettlementAccountId(1043)).toBe(false);
      expect(isSettlementAccountId(undefined)).toBe(false);
    });
  });

  describe('сторона баланса', () => {
    it('должны нам — имущество', () => {
      const side = settlementAccountSide(500_000);

      expect(side.accountType).toBe('other-current-asset');
      expect(side.accountId).toBe(INTERCOMPANY_RECEIVABLE_ACCOUNT_ID);
    });

    it('должны мы — обязательство', () => {
      // ЖИВАЯ ПРОВЕРКА: у ИП, получившего 500 000 от своего ООО, при
      // единственной имущественной строке выходило «Активы 0» — деньги на
      // счету есть, а отчёт показывает ноль.
      const side = settlementAccountSide(-500_000);

      expect(side.accountType).toBe('other-current-liability');
      expect(side.accountId).toBe(INTERCOMPANY_PAYABLE_ACCOUNT_ID);
    });

    it('ноль — имущественная сторона, строки всё равно не будет', () => {
      expect(settlementAccountSide(0).accountType).toBe('other-current-asset');
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
