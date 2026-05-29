import { ServiceError } from '@/modules/Items/ServiceError';
import { DeleteManagementArticleService } from './DeleteManagementArticle.service';
import { ERRORS } from '../constants';

describe('DeleteManagementArticleService', () => {
  it('refuses to delete an article that still has children', async () => {
    const articleModel = () => ({
      query: () => ({
        findById: () => Promise.resolve({ id: 1, name: 'Расходы' }),
        where: () => ({ resultSize: () => Promise.resolve(2) }),
      }),
    });
    const uow = { withTransaction: (cb: any) => cb({}) };

    const service = new DeleteManagementArticleService(
      uow as any,
      articleModel as any,
    );

    await expect(service.delete(1)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_HAS_CHILDREN,
    });
  });
});
