import { MaterializePlannedOperationService } from './MaterializePlannedOperation.service';
import { ERRORS } from '../constants';

/**
 * О3 (карта v13): материализация плановой операции в реальную денежную
 * операцию по кнопке.
 */
describe('MaterializePlannedOperationService', () => {
  const baseOp = {
    id: 3,
    direction: 'outflow',
    amount: 50000,
    currencyCode: 'RUB',
    plannedDate: '2026-09-01',
    articleId: 11,
    accountId: 1002,
    branchId: null,
    status: 'planned',
    recurrence: null as any,
    description: 'Аренда офиса',
  };
  const baseArticle = {
    id: 11,
    accounts: [{ id: 701, accountType: 'expense' }],
  };

  const build = (op: any, article: any) => {
    const opQuery = {
      findById: jest.fn().mockResolvedValue(op),
      patchAndFetchById: jest.fn().mockResolvedValue({ ...op }),
    };
    const articleQuery = {
      findById: jest.fn(() => ({
        withGraphFetched: jest.fn().mockResolvedValue(article),
      })),
    };
    const newCashflowTransaction = jest.fn().mockResolvedValue({ id: 77 });
    const service = new MaterializePlannedOperationService(
      (() => ({ query: () => opQuery })) as any,
      (() => ({ query: () => articleQuery })) as any,
      { newCashflowTransaction } as any,
    );
    return { service, opQuery, newCashflowTransaction };
  };

  it('разовый расход: создаёт OtherExpense и помечает план исполненным', async () => {
    const { service, opQuery, newCashflowTransaction } = build(
      baseOp,
      baseArticle,
    );
    const result = await service.materialize(3);

    expect(newCashflowTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-09-01',
        transactionType: 'OtherExpense',
        amount: 50000,
        currencyCode: 'RUB',
        creditAccountId: 701,
        cashflowAccountId: 1002,
        description: 'Аренда офиса',
        publish: true,
      }),
    );
    expect(opQuery.patchAndFetchById).toHaveBeenCalledWith(3, {
      status: 'done',
    });
    expect(result).toEqual({ id: 77 });
  });

  it('приход превращается в OtherIncome со счётом доходного типа', async () => {
    const { service, newCashflowTransaction } = build(
      { ...baseOp, direction: 'inflow' },
      { id: 11, accounts: [{ id: 601, accountType: 'income' }] },
    );
    await service.materialize(3);

    expect(newCashflowTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'OtherIncome',
        creditAccountId: 601,
      }),
    );
  });

  it('повторяющийся план сдвигается на следующее вхождение, а не закрывается', async () => {
    const { service, opQuery } = build(
      { ...baseOp, recurrence: { frequency: 'monthly', interval: 1 } },
      baseArticle,
    );
    await service.materialize(3);

    expect(opQuery.patchAndFetchById).toHaveBeenCalledWith(3, {
      plannedDate: '2026-10-01',
    });
  });

  it('дата вхождения из запроса сдвигает план дальше неё', async () => {
    const { service, opQuery, newCashflowTransaction } = build(
      { ...baseOp, recurrence: { frequency: 'monthly', interval: 1 } },
      baseArticle,
    );
    await service.materialize(3, { date: '2026-11-01' });

    expect(newCashflowTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-11-01' }),
    );
    expect(opQuery.patchAndFetchById).toHaveBeenCalledWith(3, {
      plannedDate: '2026-12-01',
    });
  });

  it('повторение с датой окончания: после последнего вхождения план исполнен', async () => {
    const { service, opQuery } = build(
      {
        ...baseOp,
        recurrence: { frequency: 'monthly', interval: 1, endDate: '2026-09-15' },
      },
      baseArticle,
    );
    await service.materialize(3);

    expect(opQuery.patchAndFetchById).toHaveBeenCalledWith(3, {
      status: 'done',
    });
  });

  it('у статьи два подходящих счёта — понятная ошибка', async () => {
    const { service } = build(baseOp, {
      id: 11,
      accounts: [
        { id: 701, accountType: 'expense' },
        { id: 702, accountType: 'other-expense' },
      ],
    });
    await expect(service.materialize(3)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_ACCOUNT_AMBIGUOUS,
    });
  });

  it('у статьи нет счёта подходящего типа — понятная ошибка', async () => {
    const { service } = build(baseOp, {
      id: 11,
      accounts: [{ id: 705, accountType: 'fixed-asset' }],
    });
    await expect(service.materialize(3)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_HAS_NO_SUITABLE_ACCOUNT,
    });
  });

  it('план без статьи или без денежного счёта не материализуется', async () => {
    const noArticle = build({ ...baseOp, articleId: null }, baseArticle);
    await expect(noArticle.service.materialize(3)).rejects.toMatchObject({
      errorType: ERRORS.PLAN_HAS_NO_ARTICLE,
    });

    const noAccount = build({ ...baseOp, accountId: null }, baseArticle);
    await expect(noAccount.service.materialize(3)).rejects.toMatchObject({
      errorType: ERRORS.PLAN_HAS_NO_ACCOUNT,
    });
  });

  it('исполненный план и несуществующий id отвергаются', async () => {
    const done = build({ ...baseOp, status: 'done' }, baseArticle);
    await expect(done.service.materialize(3)).rejects.toMatchObject({
      errorType: ERRORS.OPERATION_NOT_MATERIALIZABLE,
    });

    const missing = build(null, baseArticle);
    await expect(missing.service.materialize(99)).rejects.toMatchObject({
      errorType: ERRORS.PLANNED_OPERATION_NOT_FOUND,
    });
  });
});
