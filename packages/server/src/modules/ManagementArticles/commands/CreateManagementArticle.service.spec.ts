import { CreateManagementArticleService } from './CreateManagementArticle.service';

describe('CreateManagementArticleService', () => {
  it('validates then inserts the article inside a transaction', async () => {
    const inserted = { id: 10, name: 'Аренда', kind: 'expense' };

    const insert = jest.fn().mockResolvedValue(inserted);
    const articleModel = () => ({ query: () => ({ insert }) });
    const articleAccountModel = () => ({ query: () => ({ insert: jest.fn() }) });

    const validator = {
      validateNameUniqueness: jest.fn().mockResolvedValue(undefined),
      validateParentExists: jest.fn().mockResolvedValue(undefined),
      validateAccountsExist: jest.fn().mockResolvedValue(undefined),
      validateAccountsMatchKind: jest.fn().mockResolvedValue(undefined),
      validateAccountsNotMapped: jest.fn().mockResolvedValue(undefined),
    };
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new CreateManagementArticleService(
      uow as any,
      validator as any,
      articleModel as any,
      articleAccountModel as any,
    );

    const result = await service.create({
      name: 'Аренда',
      kind: 'expense',
    } as any);

    expect(validator.validateNameUniqueness).toHaveBeenCalledWith('Аренда');
    expect(insert).toHaveBeenCalled();
    expect(result).toEqual(inserted);
  });
});
