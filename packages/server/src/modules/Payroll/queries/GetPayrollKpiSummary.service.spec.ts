// © 2026 Bigfin
import { GetPayrollKpiSummaryService } from './GetPayrollKpiSummary.service';

const targets = [
  {
    id: 1,
    employeeId: 10,
    periodMonth: '2026-06-01',
    metric: 'revenue',
    targetAmount: 300000,
    bonusRate: 10,
    onlyIfAchieved: false,
    employee: { id: 10, fullName: 'Иванова Мария' },
  },
  {
    id: 2,
    employeeId: 20,
    periodMonth: '2026-06-01',
    metric: 'profit',
    targetAmount: 100000,
    bonusRate: 5,
    onlyIfAchieved: false,
    employee: { id: 20, fullName: 'Петров Олег' },
  },
];

// Сделки: две у менеджера 10, одна без менеджера (не должна считаться).
const deals = [
  { id: 101, managerId: 10 },
  { id: 102, managerId: 10 },
];

// Свёртка по сделке: dealId → строки статей (income/expense, корневые).
const rollupByDeal: Record<number, any[]> = {
  101: [
    { id: 1, name: 'Выручка', kind: 'income', amount: 100000, parentId: null },
    { id: 2, name: 'Расходы', kind: 'expense', amount: 40000, parentId: null },
  ],
  102: [
    { id: 1, name: 'Выручка', kind: 'income', amount: 150000, parentId: null },
  ],
};

function makeService(targetRows = targets, dealRows = deals) {
  const getRollup = jest.fn(({ projectId }) =>
    Promise.resolve(rollupByDeal[projectId] || []),
  );
  const rollup = { getRollup };

  const whereIn = jest.fn().mockResolvedValue(dealRows);
  const dealModel = () => ({ query: () => ({ whereIn }) });

  const targetQuery: any = {
    where: () => targetQuery,
    withGraphFetched: () => targetQuery,
    orderBy: () => targetQuery,
    then: (resolve: any, reject: any) =>
      Promise.resolve(targetRows).then(resolve, reject),
  };
  const targetModel = () => ({ query: () => targetQuery });

  const service = new GetPayrollKpiSummaryService(
    rollup as any,
    dealModel as any,
    targetModel as any,
  );
  return { service, getRollup, whereIn };
}

describe('GetPayrollKpiSummaryService', () => {
  it('агрегирует факт по сделкам менеджера и считает бонус', async () => {
    const { service, getRollup } = makeService();

    const rows = await service.getSummary('2026-06');

    // Менеджер 10 (revenue): 100 000 + 150 000 = 250 000; бонус 10% = 25 000.
    const m10 = rows.find((r) => r.employeeId === 10);
    expect(m10).toMatchObject({
      fullName: 'Иванова Мария',
      metric: 'revenue',
      targetAmount: 300000,
      fact: 250000,
      bonus: 25000,
    });
    expect(m10.achievementPct).toBeCloseTo(83.33, 2);

    // Свёртка вызывается за календарный месяц плана.
    expect(getRollup).toHaveBeenCalledWith(
      expect.objectContaining({ fromDate: '2026-06-01', toDate: '2026-06-30' }),
    );
  });

  it('менеджер без сделок → факт 0, бонус 0', async () => {
    const { service } = makeService();

    const rows = await service.getSummary('2026-06');
    const m20 = rows.find((r) => r.employeeId === 20);

    expect(m20).toMatchObject({ fact: 0, bonus: 0, achievementPct: 0 });
  });

  it('сделки без менеджера не считаются (выборка только по manager_id планов)', async () => {
    const { service, whereIn } = makeService();

    await service.getSummary('2026-06');

    expect(whereIn).toHaveBeenCalledWith('managerId', [10, 20]);
  });

  it('без планов на месяц возвращает пустой список и не трогает сделки', async () => {
    const { service, whereIn } = makeService([]);

    await expect(service.getSummary('2026-06')).resolves.toEqual([]);
    expect(whereIn).not.toHaveBeenCalled();
  });

  it('bonusesForMonth возвращает карту employeeId → бонус', async () => {
    const { service } = makeService();

    await expect(service.bonusesForMonth('2026-06-01')).resolves.toEqual({
      10: 25000,
      20: 0,
    });
  });
});
