// © 2026 Bigfin
import { GetReportDrillDownService } from './GetReportDrillDown.service';

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

  const transactionModel = () => {
    const chain: any = {
      where: () => chain,
      withGraphFetched: () => chain,
      orderBy: () => chain,
      limit: async () => options.rows ?? [],
    };
    return { query: () => chain };
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
      formattedAmount: '70000.00 RUB',
    });
  });
});
