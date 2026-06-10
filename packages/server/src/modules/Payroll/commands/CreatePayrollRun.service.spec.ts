// © 2026 Bigfin
import { CreatePayrollRunService } from './CreatePayrollRun.service';

const employees = [
  { id: 1, fullName: 'Иванова Мария', employmentType: 'staff', defaultSalary: 100000 },
  { id: 2, fullName: 'Петров Олег', employmentType: 'npd', defaultSalary: 50000 },
];

const settings = {
  ndflRate: 13,
  contribMode: 'standard',
  contribRate: 30,
  mspRate: 15,
  mspThreshold: 40639.5,
  payrollArticleId: null,
  taxesArticleId: null,
};

function makeService(kpiBonuses: Record<number, number> = {}) {
  const employeeQuery: any = {
    modify: () => employeeQuery,
    orderBy: () => employeeQuery,
    then: (resolve: any, reject: any) =>
      Promise.resolve(employees).then(resolve, reject),
  };
  const employeeModel = () => ({ query: () => employeeQuery });

  const runInsert = jest.fn().mockResolvedValue({ id: 7 });
  const runModel = () => ({
    query: () => ({ findOne: () => Promise.resolve(undefined), insert: runInsert }),
  });

  const lineInsert = jest.fn().mockResolvedValue({ id: 1 });
  const lineModel = () => ({ query: () => ({ insert: lineInsert }) });

  const uow = { withTransaction: async (work: any) => work({}) };
  const payrollSettings = { getSettings: async () => settings };
  const kpiSummary = {
    bonusesForMonth: jest.fn().mockResolvedValue(kpiBonuses),
  };

  const service = new CreatePayrollRunService(
    uow as any,
    payrollSettings as any,
    kpiSummary as any,
    employeeModel as any,
    runModel as any,
    lineModel as any,
  );
  return { service, lineInsert, kpiSummary };
}

describe('CreatePayrollRunService — пре-заполнение бонусов из KPI', () => {
  it('бонус подставляется из KPI-плана месяца', async () => {
    const { service, lineInsert, kpiSummary } = makeService({ 1: 25000 });

    await service.create({ periodMonth: '2026-06-15', payDate: '2026-07-05' } as any);

    expect(kpiSummary.bonusesForMonth).toHaveBeenCalledWith('2026-06-01');
    expect(lineInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeId: 1,
        baseAmount: 100000,
        bonusAmount: 25000,
        // staff: НДФЛ 13% от (100 000 + 25 000)
        ndflAmount: 16250,
      }),
    );
  });

  it('без KPI-плана бонус 0 (поведение ⑧a не меняется)', async () => {
    const { service, lineInsert } = makeService({});

    await service.create({ periodMonth: '2026-06-01', payDate: '2026-07-05' } as any);

    expect(lineInsert).toHaveBeenCalledTimes(2);
    expect(lineInsert).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 1, bonusAmount: 0 }),
    );
    expect(lineInsert).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 2, bonusAmount: 0 }),
    );
  });
});
