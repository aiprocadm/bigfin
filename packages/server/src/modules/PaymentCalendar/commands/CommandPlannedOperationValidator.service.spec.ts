import { ServiceError } from '@/modules/Items/ServiceError';
import { CommandPlannedOperationValidatorService } from './CommandPlannedOperationValidator.service';
import { ERRORS } from '../constants';

const articleModelStub = (found: any) => () => ({
  query: () => ({ findById: (_id: number) => Promise.resolve(found) }),
});
const accountModelStub = (found: any) => () => ({
  query: () => ({ findById: (_id: number) => Promise.resolve(found) }),
});

describe('CommandPlannedOperationValidatorService', () => {
  it('throws when the referenced article does not exist', async () => {
    const service = new CommandPlannedOperationValidatorService(
      articleModelStub(null) as any,
      accountModelStub({ id: 1 }) as any,
    );

    await expect(service.validateArticleExists(99)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_NOT_FOUND,
    });
  });

  it('passes when the article exists', async () => {
    const service = new CommandPlannedOperationValidatorService(
      articleModelStub({ id: 3 }) as any,
      accountModelStub({ id: 1 }) as any,
    );

    await expect(service.validateArticleExists(3)).resolves.toBeUndefined();
  });

  it('skips article validation when no articleId given', async () => {
    const service = new CommandPlannedOperationValidatorService(
      articleModelStub(null) as any,
      accountModelStub(null) as any,
    );

    await expect(
      service.validateArticleExists(undefined),
    ).resolves.toBeUndefined();
  });
});
