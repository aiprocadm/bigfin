// © 2026 Bigfin
import { GetReportDrillDownService } from '@/modules/FinancialStatements/queries/GetReportDrillDown.service';
import { GetTransactionsSummaryService } from '@/modules/BankingTransactions/queries/GetTransactionsSummary.service';

/**
 * «Золотые» ответы прежних адресов (раздел 14.3 ТЗ-2, задача T-57).
 *
 * ЗАЧЕМ. За второе ТЗ прежние ручки обросли новыми полями и параметрами.
 * Добавить поле безопасно; переименовать или убрать — значит сломать
 * витрину, которая читает ответ по именам. Ошибка такого рода не видна ни
 * типам (ответы собираются как `any`), ни модульным тестам (они смотрят на
 * одно-два поля), и вылезает уже на экране человека.
 *
 * КАК ЭТО РАБОТАЕТ. Снимок ответа на ФИКСИРОВАННОМ наборе параметров.
 * Изменение снимка — не ошибка сама по себе, но требует осознанного
 * обновления в запросе на слияние: «я знаю, что меняю договор с витриной».
 *
 * СНИМОК ДЕЛАЕТСЯ С ЖИВЫХ СЛУЖБ, а подставлены только модели: иначе
 * фиксировался бы вымысел, а не договор.
 */

/** Набор параметров зафиксирован: он и есть «прежний вызов» из ТЗ. */
const GOLDEN_PERIOD = { fromDate: '2026-03-01', toDate: '2026-03-31' };

const buildDrillDownService = () => {
  const accountModel = () => ({
    query: () => ({
      findById: async () => ({
        id: 7,
        name: 'Выручка',
        accountNormal: 'credit',
      }),
    }),
  });

  const rows = [
    { date: '2026-03-02', credit: 100_000.55, debit: 0 },
    { date: '2026-03-05', credit: 50_000.45, debit: 0 },
    { date: '2026-03-07', credit: 0, debit: 20_000.1 },
  ];

  const transactionModel = () => {
    const makeChain = () => {
      const chain: any = {
        where: () => chain,
        withGraphFetched: () => chain,
        orderBy: () => chain,
        limit: async (count: number) => rows.slice(0, count),
        sum: () => chain,
        count: () => chain,
        first: async () => ({
          debit: rows.reduce((sum, row) => sum + Number(row.debit ?? 0), 0),
          credit: rows.reduce((sum, row) => sum + Number(row.credit ?? 0), 0),
          total: rows.length,
        }),
      };

      return chain;
    };

    return { query: makeChain };
  };

  const emptyModel = () => ({ query: () => Promise.resolve([]) });

  return new GetReportDrillDownService(
    { getTenantMetadata: async () => ({ baseCurrency: 'RUB' }) } as any,
    accountModel as any,
    transactionModel as any,
    emptyModel as any,
    emptyModel as any,
  );
};

const buildSummaryService = () => {
  const rows = [
    { debit: 120_300.55, credit: 0, transactionType: 'SaleInvoice', currencyCode: 'RUB' },
    { debit: 0, credit: 45_100.25, transactionType: 'Expense', currencyCode: 'RUB' },
    {
      debit: 150_000.4,
      credit: 0,
      transactionType: 'TransferToAccount',
      currencyCode: 'RUB',
    },
  ];

  const transactionModel = () => ({
    query: () => ({
      onBuild: (build: (qb: any) => void) => {
        const qb: any = new Proxy({}, { get: () => () => qb });
        build(qb);
        return Promise.resolve(rows);
      },
    }),
  });

  const emptyModel = () => ({
    query: () => ({
      whereIn: () => ({ select: async () => [] }),
      where: () => ({ select: async () => [] }),
      select: async () => [],
    }),
  });

  return new GetTransactionsSummaryService(
    { getTenantMetadata: async () => ({ baseCurrency: 'RUB' }) } as any,
    transactionModel as any,
    emptyModel as any,
    emptyModel as any,
    emptyModel as any,
  );
};

describe('«золотые» ответы прежних адресов', () => {
  it('раскрытие суммы отчёта по счёту', async () => {
    // Прежний вызов: `GET /financial-reports/chart/drill-down?accountId=7`.
    const result = await buildDrillDownService().getDrillDown(
      7,
      GOLDEN_PERIOD.fromDate,
      GOLDEN_PERIOD.toDate,
    );

    expect(result).toMatchSnapshot();
  });

  it('состав полей раскрытия не усох', async () => {
    // Отдельная проверка рядом со снимком: снимок легко обновить не читая,
    // а список имён заставляет увидеть пропажу.
    const result = await buildDrillDownService().getDrillDown(
      7,
      GOLDEN_PERIOD.fromDate,
      GOLDEN_PERIOD.toDate,
    );

    expect(Object.keys(result).sort()).toEqual(
      expect.arrayContaining(['total', 'transactions']),
    );
  });

  it('итоги реестра операций', async () => {
    // Прежний вызов: `GET /banking/transactions?...` вместе со сводной
    // строкой, которую витрина читает по именам полей.
    const summary = await buildSummaryService().getSummary({});

    expect(summary).toMatchSnapshot();
  });

  it('состав полей итогов реестра не усох', async () => {
    const summary = await buildSummaryService().getSummary({});

    expect(Object.keys(summary).sort()).toEqual([
      'count',
      'currencyCode',
      'hasForeignCurrency',
      'inflow',
      'net',
      'outflow',
      'transfers',
    ]);
  });

  it('каждая сумма приходит И ЧИСЛОМ, И НАДПИСЬЮ', async () => {
    // Витрина не форматирует деньги сама (правило §5.2 ТЗ), поэтому обе
    // части договора обязаны быть на месте.
    const summary: any = await buildSummaryService().getSummary({});

    ['inflow', 'outflow', 'transfers', 'net'].forEach((key) => {
      expect(typeof summary[key].amount).toBe('number');
      expect(typeof summary[key].formatted).toBe('string');
    });
  });
});
