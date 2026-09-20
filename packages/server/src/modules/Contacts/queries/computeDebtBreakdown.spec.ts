// © 2026 Bigfin
import {
  breakdownContactDebt,
  computeDebtBreakdown,
} from './computeDebtBreakdown';

/**
 * Денежная и неденежная задолженность (FIN-023 ТЗ-2).
 *
 * Аванс, полученный от клиента, и отгрузка без оплаты — принципиально разные
 * обязательства. В отчётах старения они сливаются в одно сальдо, и человек
 * планирует платежи, которых нечем закрыть.
 */
describe('разбор задолженности по природе', () => {
  describe('один контрагент', () => {
    it('отгрузили и не получили денег — нам должны ДЕНЬГИ', () => {
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: 100_000,
        payableNet: 0,
      });

      expect(result.receivable.money).toBe(100_000);
      expect(result.receivable.goods).toBe(0);
      expect(result.payable.total).toBe(0);
    });

    it('получили аванс — мы должны ИСПОЛНЕНИЕ, а не деньги', () => {
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: -60_000,
        payableNet: 0,
      });

      expect(result.payable.goods).toBe(60_000);
      expect(result.payable.money).toBe(0);
      expect(result.receivable.total).toBe(0);
    });

    it('счёт поставщика не оплачен — мы должны ДЕНЬГИ', () => {
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: 0,
        payableNet: 40_000,
      });

      expect(result.payable.money).toBe(40_000);
    });

    it('заплатили поставщику вперёд — нам должны ПОСТАВКУ', () => {
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: 0,
        payableNet: -25_000,
      });

      expect(result.receivable.goods).toBe(25_000);
      expect(result.receivable.money).toBe(0);
    });

    it('аванс и отгрузка на равные суммы дают НОЛИ в обеих колонках', () => {
      // Приёмка 2 FIN-023. Зачёт выполняется ДО классификации: человек не
      // должен ничего и ему не должны ничего, и показывать тут нечего.
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: 0,
        payableNet: 0,
      });

      expect(result.receivable.total).toBe(0);
      expect(result.payable.total).toBe(0);
    });

    it('контрагент и покупатель, и поставщик — обе стороны считаются', () => {
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: 70_000,
        payableNet: 30_000,
      });

      expect(result.receivable.money).toBe(70_000);
      expect(result.payable.money).toBe(30_000);
    });

    it('НИЧЕГО НЕ ТЕРЯЕТСЯ: обе стороны сальдо представлены полностью', () => {
      // Приёмка 1 FIN-023. Разбивку сверят с отчётом старения, и расхождение
      // обесценит оба числа сразу.
      const position = {
        contactId: 1,
        receivableNet: -15_000,
        payableNet: 80_000,
      };
      const result = breakdownContactDebt(position);

      expect(result.receivable.money - result.payable.goods).toBe(
        position.receivableNet,
      );
      expect(result.payable.money - result.receivable.goods).toBe(
        position.payableNet,
      );
    });

    it('часть равна сумме своих слагаемых', () => {
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: 70_000,
        payableNet: -30_000,
      });

      expect(result.receivable.total).toBe(
        result.receivable.money + result.receivable.goods,
      );
    });

    it('копейки не теряются', () => {
      const result = breakdownContactDebt({
        contactId: 1,
        receivableNet: 0.1,
        payableNet: -0.2,
      });

      expect(result.receivable.total).toBe(0.3);
    });
  });

  describe('список и итоги', () => {
    it('контрагенты без долга не возвращаются', () => {
      const result = computeDebtBreakdown([
        { contactId: 1, receivableNet: 0, payableNet: 0 },
        { contactId: 2, receivableNet: 500, payableNet: 0 },
      ]);

      expect(result.contacts.map((row) => row.contactId)).toEqual([2]);
    });

    it('итог складывается из строк', () => {
      const result = computeDebtBreakdown([
        { contactId: 1, receivableNet: 500, payableNet: 0 },
        { contactId: 2, receivableNet: 300, payableNet: 200 },
      ]);

      expect(result.totals.receivable.money).toBe(800);
      expect(result.totals.payable.money).toBe(200);
    });

    it('авансы названы своими именами', () => {
      // На главной это строка «авансы получены / авансы выданы»: без неё
      // человек не понимает, откуда взялась неденежная часть.
      const result = computeDebtBreakdown([
        { contactId: 1, receivableNet: -100, payableNet: 0 },
        { contactId: 2, receivableNet: 0, payableNet: -250 },
      ]);

      expect(result.totals.advancesReceived).toBe(100);
      expect(result.totals.advancesPaid).toBe(250);
    });

    it('пустой список не роняет расчёт', () => {
      const result = computeDebtBreakdown();

      expect(result.contacts).toEqual([]);
      expect(result.totals.receivable.total).toBe(0);
    });
  });
});
