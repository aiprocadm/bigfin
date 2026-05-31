import { CreatePlannedOperationService } from './CreatePlannedOperation.service';

describe('CreatePlannedOperationService', () => {
  it('validates references then inserts the operation', async () => {
    const inserted = { id: 7, direction: 'inflow', amount: 200000 };
    const insert = jest.fn().mockResolvedValue(inserted);
    const operationModel = () => ({ query: () => ({ insert }) });

    const validator = {
      validateArticleExists: jest.fn().mockResolvedValue(undefined),
      validateAccountExists: jest.fn().mockResolvedValue(undefined),
    };
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new CreatePlannedOperationService(
      uow as any,
      validator as any,
      operationModel as any,
    );

    const result = await service.create({
      direction: 'inflow',
      amount: 200000,
      plannedDate: '2026-06-15',
      articleId: 3,
      accountId: 12,
    } as any);

    expect(validator.validateArticleExists).toHaveBeenCalledWith(3);
    expect(validator.validateAccountExists).toHaveBeenCalledWith(12);
    expect(insert).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });
});
