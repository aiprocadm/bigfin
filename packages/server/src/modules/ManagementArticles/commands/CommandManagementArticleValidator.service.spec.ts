import { ServiceError } from '@/modules/Items/ServiceError';
import { CommandManagementArticleValidatorService } from './CommandManagementArticleValidator.service';
import { ERRORS } from '../constants';

const queryStub = (result: any) => ({
  query: () => ({
    findOne: () => ({ onBuild: () => Promise.resolve(result) }),
    findById: (_id: number) => Promise.resolve(result),
  }),
});

describe('CommandManagementArticleValidatorService', () => {
  const build = (articleResult: any) => {
    const articleModel = () => queryStub(articleResult);
    const accountModel = () => queryStub(null);
    const articleAccountModel = () => queryStub(null);
    return new CommandManagementArticleValidatorService(
      articleModel as any,
      accountModel as any,
      articleAccountModel as any,
    );
  };

  it('throws when the article name already exists', async () => {
    const service = build({ id: 5, name: 'Выручка' });
    await expect(
      service.validateNameUniqueness('Выручка'),
    ).rejects.toMatchObject({ errorType: ERRORS.ARTICLE_NAME_EXISTS });
  });

  it('passes when the article name is free', async () => {
    const service = build(null);
    await expect(
      service.validateNameUniqueness('Аренда'),
    ).resolves.toBeUndefined();
  });
});

describe('CommandManagementArticleValidatorService.validateNoParentCycle', () => {
  const buildWithAncestors = (
    ancestors: Record<number, { parentId: number | null }>,
  ) => {
    const articleModel = () => ({
      query: () => ({
        findById: (id: number) => Promise.resolve(ancestors[id] ?? null),
      }),
    });
    const noop = () => ({ query: () => ({}) });
    return new CommandManagementArticleValidatorService(
      articleModel as any,
      noop as any,
      noop as any,
    );
  };

  it('throws when an article is set as its own parent', async () => {
    const service = buildWithAncestors({});
    await expect(service.validateNoParentCycle(5, 5)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_PARENT_CYCLE,
    });
  });

  it('throws when the parent chain cycles back to the article', async () => {
    // article 5; parent 6; 6's parent is 5 -> cycle
    const service = buildWithAncestors({
      6: { parentId: 5 },
      5: { parentId: 6 },
    });
    await expect(service.validateNoParentCycle(5, 6)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_PARENT_CYCLE,
    });
  });

  it('passes when the parent chain has no cycle', async () => {
    const service = buildWithAncestors({ 6: { parentId: null } });
    await expect(
      service.validateNoParentCycle(5, 6),
    ).resolves.toBeUndefined();
  });
});
