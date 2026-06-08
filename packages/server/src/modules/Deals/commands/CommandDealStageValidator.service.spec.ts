// © 2026 Bigfin
import { Test } from '@nestjs/testing';
import { Deal } from '@/modules/Deals/models/Deal.model';
import { CommandDealStageValidatorService } from './CommandDealStageValidator.service';

const dealModel = (found: any) => () => ({ query: () => ({ findById: async () => found }) });

describe('CommandDealStageValidatorService', () => {
  const build = async (deal: any) => {
    const ref = await Test.createTestingModule({
      providers: [
        CommandDealStageValidatorService,
        { provide: Deal.name, useValue: dealModel(deal) },
      ],
    }).compile();
    return ref.get(CommandDealStageValidatorService);
  };

  it('throws DEAL_NOT_FOUND when the deal is missing', async () => {
    const v = await build(null);
    await expect(v.validate(9, { name: 'X' } as any)).rejects.toMatchObject({ errorType: 'DEAL_NOT_FOUND' });
  });

  it('throws STAGE_NAME_REQUIRED when name is blank', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: '  ' } as any)).rejects.toMatchObject({ errorType: 'STAGE_NAME_REQUIRED' });
  });

  it('throws STAGE_NEGATIVE_AMOUNT for a negative planned amount', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: 'X', plannedRevenue: -1 } as any)).rejects.toMatchObject({ errorType: 'STAGE_NEGATIVE_AMOUNT' });
  });

  it('throws STAGE_NEGATIVE_AMOUNT for a negative planned cost', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: 'X', plannedCost: -1 } as any)).rejects.toMatchObject({ errorType: 'STAGE_NEGATIVE_AMOUNT' });
  });

  it('throws STAGE_CLOSE_NEEDS_DATE when closing without a date', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: 'X', status: 'closed' } as any)).rejects.toMatchObject({ errorType: 'STAGE_CLOSE_NEEDS_DATE' });
  });

  it('passes a valid open stage', async () => {
    const v = await build({ id: 1 });
    await expect(v.validate(1, { name: 'Проект', plannedRevenue: 100 } as any)).resolves.toBeUndefined();
  });

  it('passes a valid closed stage with a close date', async () => {
    const v = await build({ id: 1 });
    await expect(
      v.validate(1, { name: 'Проект', status: 'closed', closedDate: '2026-03-10' } as any),
    ).resolves.toBeUndefined();
  });
});
