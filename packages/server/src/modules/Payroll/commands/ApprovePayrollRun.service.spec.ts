// © 2026 Bigfin
import { ApprovePayrollRunService } from './ApprovePayrollRun.service';

const runRow = {
  id: 5,
  status: 'draft',
  periodMonth: '2026-06-01',
  payDate: '2026-07-05',
};
const lines = [
  { ndflAmount: 13000, contributionsAmount: 30000, netAmount: 87000, totalCost: 130000 },
  { ndflAmount: 0, contributionsAmount: 0, netAmount: 50000, totalCost: 50000 },
];

function makeService(row = runRow, lineRows = lines) {
  const patch = jest.fn().mockResolvedValue(undefined);
  const findByIdResult: any = {
    patch,
    then: (resolve: any, reject: any) =>
      Promise.resolve(row).then(resolve, reject),
  };
  const runModel = () => ({ query: () => ({ findById: () => findByIdResult }) });

  const insert = jest.fn().mockResolvedValue({ id: 1 });
  const operationModel = () => ({ query: () => ({ insert }) });

  const lineModel = () => ({
    query: () => ({ where: () => Promise.resolve(lineRows) }),
  });

  const uow = { withTransaction: async (work: any) => work({}) };
  const settings = {
    getSettings: async () => ({ payrollArticleId: 7, taxesArticleId: 8 }),
  };

  const service = new ApprovePayrollRunService(
    uow as any,
    settings as any,
    runModel as any,
    lineModel as any,
    operationModel as any,
  );
  return { service, insert, patch };
}

describe('ApprovePayrollRunService', () => {
  it('создаёт 3 плановых оттока (выплата, НДФЛ, взносы) и помечает approved', async () => {
    const { service, insert, patch } = makeService();

    await service.approve(5);

    expect(insert).toHaveBeenCalledTimes(3);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'outflow',
        amount: 137000, // totalNet
        plannedDate: '2026-07-05',
        sourceType: 'payroll_run',
        sourceId: 5,
        articleId: 7,
      }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 13000, plannedDate: '2026-07-28', articleId: 8 }),
    );
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 30000, plannedDate: '2026-07-28', articleId: 8 }),
    );
    expect(patch).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' }),
    );
  });

  it('пропускает нулевые операции (нет налогов — нет оттоков налогов)', async () => {
    const { service, insert } = makeService(runRow, [
      { ndflAmount: 0, contributionsAmount: 0, netAmount: 50000, totalCost: 50000 },
    ]);
    await service.approve(5);
    expect(insert).toHaveBeenCalledTimes(1); // только выплата
  });

  it('бросает, если начисление не в черновике', async () => {
    const { service } = makeService({ ...runRow, status: 'approved' });
    await expect(service.approve(5)).rejects.toMatchObject({
      errorType: 'PAYROLL_RUN_NOT_DRAFT',
    });
  });
});
