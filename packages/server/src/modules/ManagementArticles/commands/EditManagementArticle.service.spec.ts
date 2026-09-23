// © 2026 Bigfin
import { EditManagementArticleService } from './EditManagementArticle.service';

/**
 * Правка статьи и ярус управленческого ОПиУ (FT-009 ТЗ-3).
 *
 * Самый коварный случай: вид статьи сменили, а ярус не прислали — форма
 * интеграции могла не знать о новом поле. Проверять надо тот ярус, что уже
 * записан, иначе у доходной статьи останутся «административные расходы».
 */
function makeService(existing: any) {
  const patchAndFetchById = jest.fn().mockResolvedValue({ ...existing });
  const articleModel = () => ({
    query: () => ({
      findById: jest.fn().mockResolvedValue(existing),
      patchAndFetchById,
    }),
  });
  const articleAccountModel = () => ({ query: () => ({}) });

  const validator: any = {
    validateNameUniqueness: jest.fn().mockResolvedValue(undefined),
    validateParentExists: jest.fn().mockResolvedValue(undefined),
    validateNoParentCycle: jest.fn().mockResolvedValue(undefined),
    validateKindMatchesParent: jest.fn().mockResolvedValue(undefined),
    validateChildrenMatchKind: jest.fn().mockResolvedValue(undefined),
    validateCashflowSectionPresence: jest.fn(),
    validateCostBehaviorMatchesKind: jest.fn(),
    validatePlTypeMatchesKind: jest.fn(),
    validateAccountsExist: jest.fn().mockResolvedValue(undefined),
    validateAccountsMatchKind: jest.fn().mockResolvedValue(undefined),
    validateAccountsNotMapped: jest.fn().mockResolvedValue(undefined),
  };
  const uow = { withTransaction: (cb: any) => cb({}) };

  const service = new EditManagementArticleService(
    uow as any,
    validator,
    articleModel as any,
    articleAccountModel as any,
  );
  return { service, validator, patchAndFetchById };
}

describe('правка статьи: ярус управленческого ОПиУ', () => {
  it('ярус не прислан — проверяется уже записанный, с НОВЫМ видом', async () => {
    const { service, validator } = makeService({
      id: 5,
      kind: 'expense',
      plType: 'administrative',
    });

    await service.edit(5, { name: 'Аренда', kind: 'income' } as any);

    expect(validator.validatePlTypeMatchesKind).toHaveBeenCalledWith(
      'income',
      'administrative',
    );
  });

  it('ярус прислан — проверяется присланный', async () => {
    const { service, validator } = makeService({
      id: 5,
      kind: 'expense',
      plType: 'administrative',
    });

    await service.edit(5, {
      name: 'Аренда',
      kind: 'expense',
      plType: 'overhead_production',
    } as any);

    expect(validator.validatePlTypeMatchesKind).toHaveBeenCalledWith(
      'expense',
      'overhead_production',
    );
  });

  it('прислан null — снять ярус: проверяется null, а не старый', async () => {
    const { service, validator, patchAndFetchById } = makeService({
      id: 5,
      kind: 'expense',
      plType: 'administrative',
    });

    await service.edit(5, {
      name: 'Аренда',
      kind: 'expense',
      plType: null,
    } as any);

    expect(validator.validatePlTypeMatchesKind).toHaveBeenCalledWith(
      'expense',
      null,
    );
    expect(patchAndFetchById).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ plType: null }),
    );
  });
});
