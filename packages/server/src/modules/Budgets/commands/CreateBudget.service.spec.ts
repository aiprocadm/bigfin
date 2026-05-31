import { CreateBudgetService } from './CreateBudget.service';

describe('CreateBudgetService', () => {
  it('inserts the budget inside a transaction', async () => {
    const inserted = { id: 1, name: 'Бюджет 2026', type: 'bdir' };
    const insert = jest.fn().mockResolvedValue(inserted);
    const budgetModel = () => ({ query: () => ({ insert }) });
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new CreateBudgetService(uow as any, budgetModel as any);
    const result = await service.create({
      name: 'Бюджет 2026',
      type: 'bdir',
      fiscalYear: 2026,
    } as any);

    expect(insert).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });
});
