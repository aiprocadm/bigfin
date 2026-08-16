import { ServiceError } from '@/modules/Items/ServiceError';
import { DeleteManagementArticleService } from './DeleteManagementArticle.service';
import { ERRORS } from '../constants';

/**
 * И2 (карта v12): нельзя удалить используемую статью учёта. Раньше сервис
 * проверял только дочерние статьи — а привязку к счетам, планам, бюджетам и
 * заявкам на оплату не смотрел, и статью с разнесёнными по ней операциями
 * можно было удалить, осиротив ссылки.
 */
describe('DeleteManagementArticleService', () => {
  const articleModelWithChildren = (childCount: number) => () => ({
    query: () => ({
      findById: () => Promise.resolve({ id: 1, name: 'Расходы' }),
      where: () => ({ resultSize: () => Promise.resolve(childCount) }),
    }),
  });

  // trx callable как query builder: trx(table).where(col, id).first()
  const makeTrx = (usedTables: Record<string, boolean>) => {
    const trx: any = (table: string) => ({
      where: () => ({
        first: () => Promise.resolve(usedTables[table] ? { id: 1 } : undefined),
      }),
    });
    return trx;
  };

  const buildArticleModel = () => {
    const deleteById = jest.fn().mockResolvedValue(1);
    const model: any = () => ({
      query: (_trx?: any) => ({
        findById: () => Promise.resolve({ id: 1, name: 'Расходы' }),
        where: () => ({ resultSize: () => Promise.resolve(0) }),
        deleteById,
      }),
    });
    return { model, deleteById };
  };

  it('отказывает, если у статьи есть дочерние статьи', async () => {
    const uow = { withTransaction: (cb: any) => cb({}) };
    const service = new DeleteManagementArticleService(
      uow as any,
      articleModelWithChildren(2) as any,
    );
    await expect(service.delete(1)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_HAS_CHILDREN,
    });
  });

  it.each([
    ['management_article_accounts', 'привязанные счета'],
    ['planned_operations', 'плановые операции'],
    ['budget_lines', 'строки бюджета'],
    ['payment_requests', 'заявки на оплату'],
  ])('отказывает, если статью используют: %s', async (table) => {
    const trx = makeTrx({ [table]: true });
    const uow = { withTransaction: (cb: any) => cb(trx) };
    const { model } = buildArticleModel();
    const service = new DeleteManagementArticleService(uow as any, model as any);
    await expect(service.delete(1)).rejects.toMatchObject({
      errorType: ERRORS.ARTICLE_IN_USE,
    });
  });

  it('удаляет статью, если она нигде не используется', async () => {
    const trx = makeTrx({});
    const uow = { withTransaction: (cb: any) => cb(trx) };
    const { model, deleteById } = buildArticleModel();
    const service = new DeleteManagementArticleService(uow as any, model as any);
    await service.delete(1);
    expect(deleteById).toHaveBeenCalledWith(1);
  });
});
