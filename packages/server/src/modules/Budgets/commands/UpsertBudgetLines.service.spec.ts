import { UpsertBudgetLinesService } from './UpsertBudgetLines.service';

describe('UpsertBudgetLinesService', () => {
  it('upserts each line by the unique cell key', async () => {
    // query().insert(rows).onConflict([...]).merge([...]) — chainable stub.
    const merge = jest.fn().mockResolvedValue([]);
    const onConflict = jest.fn().mockReturnValue({ merge });
    const insert = jest.fn().mockReturnValue({ onConflict });
    const lineModel = () => ({ query: () => ({ insert }) });
    const validator = {
      validateBudgetExists: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new UpsertBudgetLinesService(
      uow as any,
      validator as any,
      lineModel as any,
    );

    await service.upsert(1, {
      lines: [
        {
          articleId: 3,
          period: '2026-03-01',
          scenario: 'realistic',
          plannedAmount: 150000,
        },
      ],
    } as any);

    expect(validator.validateBudgetExists).toHaveBeenCalledWith(1);
    expect(insert).toHaveBeenCalled();
    expect(onConflict).toHaveBeenCalledWith([
      'budgetId',
      'articleId',
      'period',
      'scenario',
    ]);
    expect(merge).toHaveBeenCalledWith(['plannedAmount', 'updatedAt']);
  });
});
