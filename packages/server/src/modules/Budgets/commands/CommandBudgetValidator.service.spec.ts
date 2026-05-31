import { CommandBudgetValidatorService } from './CommandBudgetValidator.service';
import { ERRORS } from '../constants';

const budgetModelStub = (found: any) => () => ({
  query: () => ({ findById: () => Promise.resolve(found) }),
});

describe('CommandBudgetValidatorService', () => {
  it('throws when the budget does not exist', async () => {
    const service = new CommandBudgetValidatorService(
      budgetModelStub(null) as any,
    );
    await expect(service.validateBudgetExists(99)).rejects.toMatchObject({
      errorType: ERRORS.BUDGET_NOT_FOUND,
    });
  });

  it('passes when the budget exists', async () => {
    const service = new CommandBudgetValidatorService(
      budgetModelStub({ id: 1 }) as any,
    );
    await expect(service.validateBudgetExists(1)).resolves.toMatchObject({
      id: 1,
    });
  });
});
