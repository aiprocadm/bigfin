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
