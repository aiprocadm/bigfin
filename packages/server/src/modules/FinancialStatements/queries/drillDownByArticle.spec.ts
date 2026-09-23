// © 2026 Bigfin
import { GetReportDrillDownService } from './GetReportDrillDown.service';

/**
 * Раскрытие суммы ПО СТАТЬЕ (FIN-004 ТЗ-2).
 *
 * Итог списка обязан совпасть с числом, по которому щёлкнули. Чтобы совпал,
 * здесь повторяются два правила расчёта отчёта: статья берётся вместе с
 * подстатьями и учитываются только документы, рассчитанные деньгами.
 * Разойдись хоть одно — человек получит список, не сходящийся с отчётом.
 */
const articles = [
  { id: 1, name: 'Расходы', parentId: null, kind: 'expense' },
  { id: 2, name: 'Аренда', parentId: 1, kind: 'expense' },
  { id: 3, name: 'Доходы', parentId: null, kind: 'income' },
];

const links = [
  { articleId: 1, accountId: 500 },
  { articleId: 2, accountId: 501 },
  { articleId: 3, accountId: 400 },
];

const accounts = [
  { id: 500, name: 'Прочие расходы', accountNormal: 'debit', accountType: 'expense' },
  { id: 501, name: 'Аренда', accountNormal: 'debit', accountType: 'expense' },
  { id: 400, name: 'Выручка', accountNormal: 'credit', accountType: 'income' },
  { id: 10, name: 'Расчётный счёт', accountNormal: 'debit', accountType: 'bank' },
];

/**
 * Проводки периода. Документ `Expense:1` задел денежный счёт — он
 * рассчитан деньгами. Документ `Bill:9` денег не касался (закупка в долг) —
 * в денежный отчёт он не входит, и в раскрытии его быть не должно.
 * `TransferToAccount:5` — перевод между своими счетами, тоже мимо.
 */
const legs = [
  { accountId: 10, debit: 0, credit: 30000, date: '2026-04-05', referenceType: 'Expense', referenceId: 1, transactionType: 'Expense' },
  { accountId: 501, debit: 30000, credit: 0, date: '2026-04-05', referenceType: 'Expense', referenceId: 1, transactionType: 'Expense', note: 'Аренда апрель' },
  { accountId: 500, debit: 5000, credit: 0, date: '2026-04-07', referenceType: 'Expense', referenceId: 2, transactionType: 'Expense' },
  { accountId: 10, debit: 0, credit: 5000, date: '2026-04-07', referenceType: 'Expense', referenceId: 2, transactionType: 'Expense' },
  { accountId: 501, debit: 99000, credit: 0, date: '2026-04-09', referenceType: 'Bill', referenceId: 9, transactionType: 'Bill' },
  { accountId: 501, debit: 7000, credit: 0, date: '2026-04-11', referenceType: 'TransferToAccount', referenceId: 5, transactionType: 'TransferToAccount' },
  { accountId: 10, debit: 0, credit: 7000, date: '2026-04-11', referenceType: 'TransferToAccount', referenceId: 5, transactionType: 'TransferToAccount' },
];

/**
 * Подделка запроса: применяет по-настоящему `whereIn`, границы дат,
 * отбор по юрлицу (вложенное условие) и `modify`.
 */
const makeQuery = (rows: any[]) => {
  const filters: Array<(row: any) => boolean> = [];
  const camel = (column: string) =>
    column.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  const builder: any = {
    whereIn: (column: string, values: any[]) => {
      filters.push((row) => values.includes(row[camel(column)]));
      return builder;
    },
    where: (column: any, op?: any, value?: any) => {
      if (typeof column === 'function') {
        // Вложенное условие отбора по юрлицу: «в списке ИЛИ пусто».
        const alternatives: Array<(row: any) => boolean> = [];
        const sub: any = {
          whereIn: (c: string, values: any[]) => {
            alternatives.push((row) => values.includes(row[camel(c)]));
            return sub;
          },
          orWhereNull: (c: string) => {
            alternatives.push((row) => row[camel(c)] == null);
            return sub;
          },
        };
        column(sub);
        filters.push((row) => alternatives.some((keep) => keep(row)));
        return builder;
      }
      if (column === 'date' && op === '>=') filters.push((r) => r.date >= value);
      if (column === 'date' && op === '<=') filters.push((r) => r.date <= value);
      return builder;
    },
    modify: (fn: any) => {
      if (typeof fn === 'function') fn(builder);
      return builder;
    },
    withGraphFetched: () => builder,
    orderBy: () => builder,
    limit: () => builder,
    then: (resolve: any) =>
      resolve(rows.filter((row) => filters.every((keep) => keep(row)))),
  };
  return builder;
};

const buildService = () => {
  const tenancyContext = {
    getTenantMetadata: async () => ({ baseCurrency: 'RUB' }),
  };
  const accountModel = () => ({
    query: () => makeQuery(accounts),
    findById: undefined,
  });
  const transactionModel = () => ({ query: () => makeQuery(legs) });
  const articleModel = () => ({
    query: () => {
      const builder: any = makeQuery(articles);
      builder.findById = (id: number) =>
        Promise.resolve(articles.find((a) => a.id === id));
      return builder;
    },
  });
  const articleAccountModel = () => ({ query: () => makeQuery(links) });

  return new GetReportDrillDownService(
    tenancyContext as any,
    accountModel as any,
    transactionModel as any,
    articleModel as any,
    articleAccountModel as any,
  );
};

describe('раскрытие суммы по статье', () => {
  it('берёт статью ВМЕСТЕ с подстатьями', async () => {
    // В отчёте родительская строка показывает поддерево целиком. Возьми
    // раскрытие только свои счета — итог оказался бы меньше строки, по
    // которой щёлкнули, и человек решил бы, что врут обе цифры.
    const result = await buildService().getDrillDownByArticle(
      1,
      '2026-04-01',
      '2026-04-30',
    );

    expect(result.total).toBe(35000);
    expect(result.articleId).toBe(1);
    expect(result.articleName).toBe('Расходы');
  });

  it('ИСКЛЮЧАЕТ документы, не рассчитанные деньгами', async () => {
    // Закупка в долг денег не двигала: в денежном отчёте её нет, значит и в
    // раскрытии быть не должно — иначе список не сойдётся с отчётом.
    const result = await buildService().getDrillDownByArticle(
      2,
      '2026-04-01',
      '2026-04-30',
    );

    expect(result.total).toBe(30000);
    expect(result.transactionsCount).toBe(1);
  });

  it('ИСКЛЮЧАЕТ переводы между своими счетами', async () => {
    const result = await buildService().getDrillDownByArticle(
      2,
      '2026-04-01',
      '2026-04-30',
    );
    const notes = result.transactions.map((row: any) => row.note);

    expect(notes).toEqual(['Аренда апрель']);
  });

  it('у статьи нет остатка: ноль здесь — не «не посчитали»', async () => {
    // Статья отвечает на вопрос «сколько прошло за период», а не «сколько
    // лежит». Показать ей остаток значило бы придумать понятие.
    const result = await buildService().getDrillDownByArticle(
      2,
      '2026-04-01',
      '2026-04-30',
    );

    expect(result.openingBalance).toBe(0);
    expect(result.closingBalance).toBe(result.total);
  });

  it('несуществующая статья — отказ, а не пустой список', async () => {
    // Пустой список читается как «операций нет», то есть врёт о данных.
    await expect(
      buildService().getDrillDownByArticle(999, '2026-04-01', '2026-04-30'),
    ).rejects.toThrow();
  });
});

describe('раскрытие ячейки матрицы «Деньги» (FT-004 ТЗ-3)', () => {
  it('учитывает юрлицо отчёта: операции другого юрлица в панель не попадают', async () => {
    // Аренда за апрель проведена вторым юрлицом, прочие расходы — первым.
    const tagged = legs.map((leg) => ({
      ...leg,
      legalEntityId: leg.referenceId === 1 ? 2 : 1,
    }));
    legs.splice(0, legs.length, ...tagged);

    const service = buildService();
    const first = await service.getDrillDownByArticle(1, '2026-04-01', '2026-04-30', {
      legalEntityIds: [1],
    });
    const all = await service.getDrillDownByArticle(1, '2026-04-01', '2026-04-30');

    expect(all.total).toBe(35000);
    expect(first.total).toBe(5000);
  });

  it('«оплачено деньгами» считается по границам всего отчёта, а не колонки', async () => {
    // Документ оплачен 31 марта, а в расходы проведён 1 апреля: отчёт за
    // март–апрель ставит его в апрельскую колонку — панель обязана тоже.
    legs.push(
      { accountId: 10, debit: 0, credit: 4000, date: '2026-03-31', referenceType: 'Expense', referenceId: 77, transactionType: 'Expense' } as any,
      { accountId: 501, debit: 4000, credit: 0, date: '2026-04-01', referenceType: 'Expense', referenceId: 77, transactionType: 'Expense' } as any,
    );
    const service = buildService();

    const columnOnly = await service.getDrillDownByArticle(2, '2026-04-01', '2026-04-30');
    const withReport = await service.getDrillDownByArticle(2, '2026-04-01', '2026-04-30', {
      reportFrom: '2026-03-01',
      reportTo: '2026-04-30',
    });

    expect(withReport.total - columnOnly.total).toBe(4000);
  });
});
