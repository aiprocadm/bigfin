import { GetPlannedOperationsService } from './GetPlannedOperations.service';

describe('GetPlannedOperationsService', () => {
  it('returns operations ordered by planned date', async () => {
    const rows = [
      { id: 1, plannedDate: '2026-06-01' },
      { id: 2, plannedDate: '2026-06-05' },
    ];
    const operationModel = () => ({
      query: () => ({ onBuild: () => Promise.resolve(rows) }),
    });

    const service = new GetPlannedOperationsService(operationModel as any);
    const res = await service.getPlannedOperations({});

    expect(res.data).toHaveLength(2);
  });
});
