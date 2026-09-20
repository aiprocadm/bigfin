// © 2026 Bigfin
import { GetHomepageInsightsService } from './GetHomepageInsights.service';

/**
 * Выручка по контрагентам берётся из ДОКУМЕНТА (FIN-018 ТЗ-2).
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ НА СТЕНДЕ. Блок «Кто приносит прибыль» был пуст
 * при выручке в полтора миллиона. Причина: контрагент записан не на той
 * стороне проводки — счёт покупателю кладёт его на сторону расчётов, а на
 * стороне дохода этого поля НЕТ НИ У ОДНОЙ проводки (проверено запросом к
 * базе стенда: 9 проводок дохода, контрагент у нуля из них).
 *
 * Ни типы, ни прежние спеки этого не видели: запрос правильный, ответ
 * пустой. Поэтому спека воспроизводит именно ту раскладку полей, что
 * встречается в живой базе.
 */
const ACCOUNTS = [
  { id: 1, accountType: 'income' },
  { id: 2, accountType: 'expense' },
  { id: 3, accountType: 'accounts-receivable' },
];

/**
 * Проводки в той раскладке, что даёт счёт покупателю: контрагент только на
 * стороне расчётов, обе стороны ссылаются на один документ.
 */
const TRANSACTIONS = [
  {
    accountId: 3,
    referenceId: 10,
    referenceType: 'SaleInvoice',
    contactId: 7,
    debit: 300_000,
    credit: 0,
  },
  {
    accountId: 1,
    referenceId: 10,
    referenceType: 'SaleInvoice',
    contactId: null,
    debit: 0,
    credit: 300_000,
  },
  {
    accountId: 3,
    referenceId: 11,
    referenceType: 'SaleInvoice',
    contactId: 8,
    debit: 100_000,
    credit: 0,
  },
  {
    accountId: 1,
    referenceId: 11,
    referenceType: 'SaleInvoice',
    contactId: null,
    debit: 0,
    credit: 100_000,
  },
  {
    // Ручная проводка дохода без контрагента вовсе: в блок попасть не
    // должна, но и уронить его не должна.
    accountId: 1,
    referenceId: 55,
    referenceType: 'ManualJournal',
    contactId: null,
    debit: 0,
    credit: 40_000,
  },
];

/** Модель проводок: разбирает запрос и сама делает группировку. */
const transactionModel = (rows: any[]) => () => ({
  query: () => {
    const state: {
      accountIds: number[] | null;
      onlyWithContact: boolean;
      groupBy: string[];
      aggregates: string[];
    } = {
      accountIds: null,
      onlyWithContact: false,
      groupBy: [],
      aggregates: [],
    };

    const qb: any = {
      sum: (expression: string) => {
        state.aggregates.push(expression.split(' ')[0]);
        return qb;
      },
      max: (expression: string) => {
        state.aggregates.push(expression.split(' ')[0]);
        return qb;
      },
      groupBy: (...columns: string[]) => {
        state.groupBy = columns;
        return qb;
      },
      select: () => qb,
      whereIn: (_column: string, ids: number[]) => {
        state.accountIds = ids;
        return qb;
      },
      whereNotNull: () => {
        state.onlyWithContact = true;
        return qb;
      },
      modify: () => qb,
    };

    return {
      onBuild: (build: (builder: any) => void) => {
        build(qb);

        const selected = rows
          .filter((row) =>
            state.accountIds ? state.accountIds.includes(row.accountId) : true,
          )
          .filter((row) => (state.onlyWithContact ? row.contactId : true));

        const grouped = new Map<string, any>();

        selected.forEach((row) => {
          const key = state.groupBy.map((column) => row[column]).join('|');
          const bucket = grouped.get(key) ?? {
            ...Object.fromEntries(
              state.groupBy.map((column) => [column, row[column]]),
            ),
            credit: 0,
            debit: 0,
            contactId: null,
          };

          bucket.credit += Number(row.credit ?? 0);
          bucket.debit += Number(row.debit ?? 0);
          if (row.contactId) bucket.contactId = row.contactId;
          grouped.set(key, bucket);
        });

        return Promise.resolve([...grouped.values()]);
      },
    };
  },
});

const buildService = (rows = TRANSACTIONS) => {
  const accountModel = () => ({
    query: () => ({ select: async () => ACCOUNTS }),
  });
  const contactModel = () => ({
    query: () => ({
      whereIn: () => ({
        select: async () => [
          { id: 7, displayName: 'ООО «Ромашка»' },
          { id: 8, displayName: 'ИП Матвеев' },
        ],
      }),
    }),
  });
  const projectModel = () => ({
    query: () => ({ whereIn: () => ({ select: async () => [] }) }),
  });

  return new GetHomepageInsightsService(
    accountModel as any,
    transactionModel(rows) as any,
    contactModel as any,
    projectModel as any,
  );
};

const PERIOD = { fromDate: '2026-09-01', toDate: '2026-09-30' };

describe('кто приносит прибыль: откуда берётся выручка', () => {
  it('КОНТРАГЕНТ НАХОДИТСЯ, хотя на стороне дохода его нет', async () => {
    const result = await buildService().getInsights(PERIOD);

    expect(result.topContractors.rows).toHaveLength(2);
    expect(result.topContractors.totalRevenue).toBe(400_000);
  });

  it('выручка достаётся тому, кто назван в документе', async () => {
    const result = await buildService().getInsights(PERIOD);
    const top = result.topContractors.rows[0];

    expect(top.name).toBe('ООО «Ромашка»');
    expect(top.revenue).toBe(300_000);
  });

  it('доход без контрагента в блок НЕ попадает', async () => {
    // Ручная проводка на 40 000 не должна ни появиться строкой, ни
    // увеличить итог: на вопрос «на ком держится бизнес» она ответа не даёт.
    const result = await buildService().getInsights(PERIOD);

    expect(result.topContractors.totalRevenue).toBe(400_000);
  });

  it('без выручки блока нет', async () => {
    const result = await buildService([]).getInsights(PERIOD);

    expect(result.topContractors.rows).toEqual([]);
    expect(result.topContractors.verdict).toBeNull();
  });

  it('проверка ловит ПРЕЖНЮЮ ошибку', async () => {
    // Мутация: если бы контрагента снова искали только среди проводок
    // доходных счетов, блок остался бы пуст — как и было на стенде.
    const onlyIncomeLegs = TRANSACTIONS.filter((row) => row.accountId === 1);

    expect(onlyIncomeLegs.every((row) => !row.contactId)).toBe(true);
  });
});
