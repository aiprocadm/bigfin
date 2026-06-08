// © 2026 Bigfin
import { Test } from '@nestjs/testing';
import { ManagementArticle } from '@/modules/ManagementArticles/models/ManagementArticle.model';
import { CommandCostAllocationValidatorService } from './CommandCostAllocationValidator.service';

const articleModel = (found: any) => () => ({ query: () => ({ findById: async () => found }) });

describe('CommandCostAllocationValidatorService', () => {
  const build = async (article: any) => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandCostAllocationValidatorService,
        { provide: ManagementArticle.name, useValue: articleModel(article) },
      ],
    }).compile();
    return ref.get(CommandCostAllocationValidatorService);
  };

  it('throws ARTICLE_NOT_FOUND when source article is missing', async () => {
    const v = await build(null);
    await expect(
      v.validate({ sourceArticleId: 9, allocationKey: 'revenue' } as any),
    ).rejects.toMatchObject({ errorType: 'ARTICLE_NOT_FOUND' });
  });

  it('throws ARTICLE_NOT_EXPENSE when source article is not an expense', async () => {
    const v = await build({ id: 1, kind: 'income' });
    await expect(
      v.validate({ sourceArticleId: 1, allocationKey: 'revenue' } as any),
    ).rejects.toMatchObject({ errorType: 'ARTICLE_NOT_EXPENSE' });
  });

  it('throws INVALID_MANUAL_SHARES for manual_share without shares', async () => {
    const v = await build({ id: 1, kind: 'expense' });
    await expect(
      v.validate({ sourceArticleId: 1, allocationKey: 'manual_share', manualShares: {} } as any),
    ).rejects.toMatchObject({ errorType: 'INVALID_MANUAL_SHARES' });
  });

  it('throws INVALID_MANUAL_SHARES when every manual share is zero', async () => {
    const v = await build({ id: 1, kind: 'expense' });
    await expect(
      v.validate({ sourceArticleId: 1, allocationKey: 'manual_share', manualShares: { '1': 0, '2': 0 } } as any),
    ).rejects.toMatchObject({ errorType: 'INVALID_MANUAL_SHARES' });
  });

  it('throws INVALID_DATE_RANGE when validFrom is after validTo', async () => {
    const v = await build({ id: 1, kind: 'expense' });
    await expect(
      v.validate({
        sourceArticleId: 1,
        allocationKey: 'revenue',
        validFrom: '2026-12-31',
        validTo: '2026-01-01',
      } as any),
    ).rejects.toMatchObject({ errorType: 'INVALID_DATE_RANGE' });
  });

  it('passes a valid revenue rule', async () => {
    const v = await build({ id: 1, kind: 'expense' });
    await expect(
      v.validate({ sourceArticleId: 1, allocationKey: 'revenue' } as any),
    ).resolves.toBeUndefined();
  });
});
