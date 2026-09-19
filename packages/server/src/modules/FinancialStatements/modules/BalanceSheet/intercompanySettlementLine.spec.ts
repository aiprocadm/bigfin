// © 2026 Bigfin
import { BalanceSheetRepository } from './BalanceSheetRepository';
import { INTERCOMPANY_SETTLEMENT_ACCOUNT_ID } from '@/modules/LegalEntities/utils/intercompanySettlement';
import { ACCOUNT_TYPE } from '@/constants/accounts';

/**
 * Сторож остатка К9: строка расчётов внутри группы ПОДКЛЮЧЕНА.
 *
 * Правило само по себе проверено отдельно. Здесь проверяется то, что его
 * зовут: ровно этот вид поломок — «правило написано, протестировано и никем
 * не вызвано» — за один вечер дал шесть живых дефектов.
 *
 * Отчёт собирает свои книги ИЗ ДВУХ методов — остатки на дату и разрез по
 * периодам. Оба обязаны досылать строку, иначе колонки отчёта разойдутся
 * между собой.
 */

/** Подставной набор проводок, который вернёт «база». */
function fakeRepository(rows: any[]) {
  const repository: any = new (BalanceSheetRepository as any)();

  // Подставной построитель запросов: он ничего не считает, а просто отдаёт
  // заранее заданные строки. Настоящий отбор проверяется другими спеками.
  const builder = {
    sum: () => builder,
    groupBy: () => builder,
    select: () => builder,
    modify: () => builder,
    groupByRaw: () => builder,
    where: () => builder,
    whereIn: () => builder,
    withGraphFetched: () => builder,
  };
  const queryResult: any = {
    onBuild: (cb: any) => {
      cb(builder);
      return Promise.resolve(rows);
    },
  };

  repository.accountTransactionModel = () => ({ query: () => queryResult });
  repository.accountModel = () => ({
    // Настоящая модель вычисляет «дебетовый ли счёт» из типа; подставная
    // обязана вести себя так же, иначе книга посчитает остаток наоборот.
    fromJson: (json: any) => ({
      ...json,
      accountNormal: 'debit',
      accountParentType: 'current-asset',
    }),
    query: () => Promise.resolve([]),
  });

  return repository;
}

/** Остаток вычисляемой строки среди полученных строк. */
function settlementOf(rows: any[]): number {
  const row = rows.find(
    (r) => r.accountId === INTERCOMPANY_SETTLEMENT_ACCOUNT_ID,
  );
  if (!row) return 0;

  return (Number(row.debit) || 0) - (Number(row.credit) || 0);
}

describe('строка расчётов внутри группы подключена к балансу', () => {
  describe('остатки на дату', () => {
    it('перекос отбора гасится досланной строкой', async () => {
      // ООО отдало 500 000: в его отбор попала только нога «кредит».
      const rows = [
        { accountId: 10, debit: 1_000_000, credit: 0 },
        { accountId: 20, debit: 0, credit: 1_500_000 },
      ];
      const repository = fakeRepository(rows);
      repository.query = { legalEntityIds: [1] };

      const result = await repository.closingAccountsTotal('2026-12-31');
      const net = result.reduce(
        (acc: number, r: any) =>
          acc + (Number(r.debit) || 0) - (Number(r.credit) || 0),
        0,
      );

      expect(settlementOf(result)).toBe(500_000);
      // Главное: после досылки отчёт сходится в ноль.
      expect(net).toBe(0);
    });

    it('в режиме всех юрлиц строка НЕ досылается', async () => {
      // Несходящийся СВОДНЫЙ баланс означает поломку данных. Строка,
      // подставляемая всегда, заклеила бы этот сигнал наглухо.
      const rows = [{ accountId: 10, debit: 100, credit: 0 }];
      const repository = fakeRepository(rows);
      repository.query = { legalEntityIds: [] };

      const result = await repository.closingAccountsTotal('2026-12-31');

      expect(result).toHaveLength(1);
      expect(settlementOf(result)).toBe(0);
    });

    it('сошедшийся отбор лишней строки не получает', async () => {
      const rows = [
        { accountId: 10, debit: 700, credit: 0 },
        { accountId: 20, debit: 0, credit: 700 },
      ];
      const repository = fakeRepository(rows);
      repository.query = { legalEntityIds: [1] };

      const result = await repository.closingAccountsTotal('2026-12-31');

      expect(result).toHaveLength(2);
    });
  });

  describe('разрез по периодам', () => {
    it('строка досылается В КАЖДЫЙ период отдельно', async () => {
      // Одной строкой на весь отчёт обойтись нельзя: колонки считаются
      // порознь, и вся сумма легла бы в один месяц.
      const rows = [
        { accountId: 10, debit: 0, credit: 300, date: '2026-01' },
        { accountId: 10, debit: 0, credit: 200, date: '2026-02' },
      ];
      const repository = fakeRepository(rows);
      repository.query = { legalEntityIds: [1] };

      const result = await repository.accountsDatePeriods(
        new Date('2026-01-01'),
        new Date('2026-02-28'),
        'month',
      );
      const extra = result.filter(
        (r: any) => r.accountId === INTERCOMPANY_SETTLEMENT_ACCOUNT_ID,
      );

      expect(extra).toHaveLength(2);
      expect(extra.map((r: any) => r.date).sort()).toEqual([
        '2026-01',
        '2026-02',
      ]);
      expect(settlementOf(extra.filter((r: any) => r.date === '2026-01'))).toBe(
        300,
      );
    });
  });

  describe('вычисляемый счёт', () => {
    it('попадает в список счетов отчёта и он оборотный актив', async () => {
      const repository = fakeRepository([]);
      repository.query = { legalEntityIds: [1] };

      await repository.initAccounts();

      const settlement = repository.accounts.find(
        (a: any) => a.id === INTERCOMPANY_SETTLEMENT_ACCOUNT_ID,
      );

      expect(settlement).toBeDefined();
      expect(settlement.accountType).toBe(ACCOUNT_TYPE.OTHER_CURRENT_ASSET);
    });

    it('в режиме всех юрлиц счёта в списке нет', async () => {
      const repository = fakeRepository([]);
      repository.query = { legalEntityIds: [] };

      await repository.initAccounts();

      expect(
        repository.accounts.some(
          (a: any) => a.id === INTERCOMPANY_SETTLEMENT_ACCOUNT_ID,
        ),
      ).toBe(false);
    });
  });
});
