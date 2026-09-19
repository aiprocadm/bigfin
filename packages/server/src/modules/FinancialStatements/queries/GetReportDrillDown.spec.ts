// © 2026 Bigfin
import {
  DRILL_DOWN_LIMIT,
  GetReportDrillDownService,
} from './GetReportDrillDown.service';

/**
 * Этап 4 ТЗ, п. 4.2. Раскрытие суммы отчёта до операций.
 *
 * ТЗ называет это ключевым требованием: «без него пользователь не доверяет
 * цифрам и уходит обратно в Excel». Значит важнее всего здесь не список сам
 * по себе, а его ИТОГ — он обязан совпасть с числом, по которому щёлкнули.
 *
 * Самая опасная ошибка: сложить суммы «как есть», не глядя на сторону счёта.
 * У доходов приход лежит в кредите, у расходов — в дебете. Сложение без
 * учёта стороны даст итог, расходящийся с отчётом, и человек решит, что
 * врут обе цифры сразу.
 */
const buildService = (options: { account?: any; rows?: any[] }) => {
  const accountModel = () => ({
    query: () => ({
      findById: async () => options.account ?? null,
    }),
  });

  /**
   * Подставная база, которая и правда ОТБИРАЕТ и СКЛАДЫВАЕТ.
   *
   * Заглушка, отдающая один и тот же список на любой запрос, не проверяет
   * ничего: она повторяет за кодом, а не спорит с ним. Здесь запомненные
   * условия `where('date', ...)` применяются по-настоящему, поэтому остаток
   * на начало и оборот за период получаются разными — как в жизни.
   */
  const transactionModel = () => {
    const rows = options.rows ?? [];

    const makeChain = () => {
      let from: string | null = null;
      let to: string | null = null;

      const selected = () =>
        rows.filter(
          (row) =>
            (from === null || row.date >= from) &&
            (to === null || row.date <= to),
        );

      const chain: any = {
        where: (column: string, operator?: string, value?: string) => {
          if (column === 'date' && operator === '>=') from = value ?? null;
          if (column === 'date' && operator === '<=') to = value ?? null;

          return chain;
        },
        withGraphFetched: () => chain,
        orderBy: () => chain,
        limit: async (count: number) => selected().slice(0, count),
        sum: () => chain,
        count: () => chain,
        first: async () => ({
          debit: selected().reduce((sum, row) => sum + Number(row.debit ?? 0), 0),
          credit: selected().reduce(
            (sum, row) => sum + Number(row.credit ?? 0),
            0,
          ),
          total: selected().length,
        }),
      };

      return chain;
    };

    return { query: makeChain };
  };

  const tenancyContext = {
    getTenantMetadata: async () => ({ baseCurrency: 'RUB' }),
  };

  return new GetReportDrillDownService(
    tenancyContext as any,
    accountModel as any,
    transactionModel as any,
  );
};

describe('раскрытие суммы отчёта', () => {
  it('у доходного счёта итог считается кредитом минус дебет', async () => {
    const service = buildService({
      account: { id: 7, name: 'Выручка', accountNormal: 'credit' },
      rows: [
        { date: '2026-03-02', credit: 100_000, debit: 0 },
        { date: '2026-03-05', credit: 50_000, debit: 0 },
        // Возврат покупателю уменьшает выручку.
        { date: '2026-03-07', credit: 0, debit: 20_000 },
      ],
    });

    const result = await service.getDrillDown(7, '2026-03-01', '2026-03-31');

    expect(result.total).toBe(130_000);
    expect(result.transactions.map((row) => row.amount)).toEqual([
      100_000,
      50_000,
      -20_000,
    ]);
  });

  it('у расходного счёта итог считается дебетом минус кредит', async () => {
    const service = buildService({
      account: { id: 9, name: 'Аренда', accountNormal: 'debit' },
      rows: [
        { date: '2026-03-03', debit: 70_000, credit: 0 },
        { date: '2026-03-20', debit: 0, credit: 5_000 },
      ],
    });

    const result = await service.getDrillDown(9, '2026-03-01', '2026-03-31');

    expect(result.total).toBe(65_000);
  });

  it('итог равен сумме строк — иначе списку нельзя верить', async () => {
    const service = buildService({
      account: { id: 9, name: 'Реклама', accountNormal: 'debit' },
      rows: [
        { date: '2026-03-01', debit: 12_345.67, credit: 0 },
        { date: '2026-03-02', debit: 7_654.33, credit: 0 },
      ],
    });

    const result = await service.getDrillDown(9, '2026-03-01', '2026-03-31');

    const sum = result.transactions.reduce((acc, row) => acc + row.amount, 0);
    expect(result.total).toBeCloseTo(sum, 2);
    expect(result.total).toBeCloseTo(20_000, 2);
  });

  it('сторона счёта читается в обоих написаниях', async () => {
    // Ответ модели приходит то в одном, то в другом виде; ошибка здесь
    // молча перевернула бы знак у половины счетов.
    const service = buildService({
      account: { id: 3, name: 'Выручка', account_normal: 'credit' },
      rows: [{ date: '2026-03-01', credit: 10_000, debit: 0 }],
    });

    const result = await service.getDrillDown(3, '2026-03-01', '2026-03-31');

    expect(result.total).toBe(10_000);
  });

  it('несуществующий счёт — понятный отказ, а не пустой список', async () => {
    const service = buildService({ account: null });

    await expect(
      service.getDrillDown(404, '2026-03-01', '2026-03-31'),
    ).rejects.toThrow('ACCOUNT_NOT_FOUND');
  });

  it('в строке видно, по чему её узнать', async () => {
    const service = buildService({
      account: { id: 9, name: 'Аренда', accountNormal: 'debit' },
      rows: [
        {
          date: '2026-03-03',
          debit: 70_000,
          credit: 0,
          transactionNumber: 'PAY-12',
          note: 'Аренда офиса за март',
          contact: { displayName: 'ООО «Дом»' },
        },
      ],
    });

    const result = await service.getDrillDown(9, '2026-03-01', '2026-03-31');

    expect(result.transactions[0]).toMatchObject({
      transactionNumber: 'PAY-12',
      note: 'Аренда офиса за март',
      contactName: 'ООО «Дом»',
      // ОЖИДАНИЕ ЗАКРЕПЛЯЛО ДЕФЕКТ: раскрытие показывало сумму
      // иначе, чем сам отчёт, и спека это защищала.
      formattedAmount: '70\u00A0000,00\u00A0₽',
    });
  });
  /**
   * Баланс и Движение денег — не про обороты.
   *
   * Их строка — ОСТАТОК на дату, а не сумма операций периода. Сложив
   * операции марта, остаток на 31 марта не получить никогда: в нём сидит
   * всё, что накопилось раньше. Сходится другое равенство:
   * остаток на начало + оборот за период = остаток на конец.
   */
  describe('остаток на начало и на конец', () => {
    const withHistory = () =>
      buildService({
        account: { id: 11, name: 'Расчётный счёт', accountNormal: 'debit' },
        rows: [
          // До периода: накопленный остаток 300 000.
          { date: '2025-11-10', debit: 500_000, credit: 0 },
          { date: '2025-12-20', debit: 0, credit: 200_000 },
          // Внутри периода: оборот +40 000.
          { date: '2026-03-05', debit: 100_000, credit: 0 },
          { date: '2026-03-18', debit: 0, credit: 60_000 },
          // После периода — не должно попасть никуда.
          { date: '2026-05-01', debit: 999_000, credit: 0 },
        ],
      });

    it('остаток на начало считается по операциям ДО периода', async () => {
      const result = await withHistory().getDrillDown(
        11,
        '2026-03-01',
        '2026-03-31',
      );

      expect(result.openingBalance).toBe(300_000);
    });

    it('оборот периода не включает прошлое и будущее', async () => {
      const result = await withHistory().getDrillDown(
        11,
        '2026-03-01',
        '2026-03-31',
      );

      expect(result.total).toBe(40_000);
    });

    it('начало плюс оборот равно концу — это и есть проверка', async () => {
      const result = await withHistory().getDrillDown(
        11,
        '2026-03-01',
        '2026-03-31',
      );

      expect(result.closingBalance).toBe(
        result.openingBalance + result.total,
      );
      expect(result.closingBalance).toBe(340_000);
    });

    it('операции первого дня не считаются дважды', async () => {
      // Граница — самое опасное место: возьми остаток на сам первый день,
      // и операции этого дня попадут и в остаток, и в оборот.
      const service = buildService({
        account: { id: 12, name: 'Касса', accountNormal: 'debit' },
        rows: [{ date: '2026-03-01', debit: 70_000, credit: 0 }],
      });

      const result = await service.getDrillDown(12, '2026-03-01', '2026-03-31');

      expect(result.openingBalance).toBe(0);
      expect(result.total).toBe(70_000);
      expect(result.closingBalance).toBe(70_000);
    });
  });

  it('итог считается по базе, а не по показанным строкам', async () => {
    // Список обрезан до 200 операций. Сложив только их, мы показали бы итог
    // меньше отчётного — ровно то недоверие к цифрам, ради устранения
    // которого раскрытие и делалось.
    const service = buildService({
      account: { id: 13, name: 'Выручка', accountNormal: 'credit' },
      rows: Array.from({ length: 250 }, (_, index) => ({
        date: `2026-03-${String((index % 28) + 1).padStart(2, '0')}`,
        credit: 1_000,
        debit: 0,
      })),
    });

    const result = await service.getDrillDown(13, '2026-03-01', '2026-03-31');

    expect(result.total).toBe(250_000);
    expect(result.transactionsCount).toBe(250);
    // Показано меньше, чем есть, и об этом сказано честно.
    expect(result.transactions).toHaveLength(DRILL_DOWN_LIMIT);
    expect(result.isTruncated).toBe(true);
  });
});
