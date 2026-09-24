// © 2026 Bigfin
import { GetAccountsTaxEstimateService } from './GetAccountsTaxEstimate.service';

/**
 * FT-070 ТЗ-3: служба оценки налога по режимам счетов.
 *
 * Модели подменены простыми подделками: проверяется сборка — какие счета
 * считаются, что без режимов служба уступает прежнему пути, и что приёмка
 * «два счёта — два режима — сумма» проходит от проводок до ответа.
 */
const build = (accounts: any[], legs: any[], metadata: any = {}) => {
  const modify = jest.fn();
  return {
    modify,
    service: new GetAccountsTaxEstimateService(
      { getTenantMetadata: async () => metadata } as any,
      (() => ({ query: async () => accounts })) as any,
      (() => ({
        query: () => ({
          onBuild: (fn: (q: any) => void) => {
            fn({ modify });
            return Promise.resolve(legs);
          },
        }),
      })) as any,
      (() => ({ query: () => ({ whereIn: async () => [] }) })) as any,
      (() => ({ query: () => ({ whereIn: async () => [] }) })) as any,
    ),
  };
};

const leg = (id: number, accountId: number, debit: number, credit: number) => ({
  referenceType: 'CashflowTransaction',
  referenceId: id,
  accountId,
  debit,
  credit,
  date: '2026-05-10',
});

const ACCOUNTS = [
  { id: 1, accountType: 'bank', taxRegime: 'USN_INCOME' },
  { id: 2, accountType: 'bank', taxRegime: 'NPD' },
  { id: 3, accountType: 'cash', taxRegime: null },
  { id: 10, accountType: 'income', taxRegime: null },
];

describe('GetAccountsTaxEstimateService', () => {
  it('ни у одного денежного счёта нет режима — уступает прежнему расчёту', async () => {
    const { service } = build(
      [
        { id: 1, accountType: 'bank', taxRegime: null },
        // Режим у счёта выручки ничего не значит и не включает новый путь.
        { id: 10, accountType: 'income', taxRegime: 'NPD' },
      ],
      [],
    );

    await expect(service.estimate('2026-05-15')).resolves.toEqual({
      applicable: false,
    });
  });

  it('приёмка: два счёта с разными режимами — налог по каждому и сумма', async () => {
    const { service, modify } = build(
      ACCOUNTS,
      [
        leg(1, 1, 100_000, 0),
        leg(1, 10, 0, 100_000),
        leg(2, 2, 50_000, 0),
        leg(2, 10, 0, 50_000),
      ],
      { taxRegime: 'USN_INCOME_EXPENSE' },
    );

    const result = await service.estimate('2026-05-15');

    expect(modify).toHaveBeenCalledWith(
      'filterDateRange',
      '2026-04-01',
      '2026-06-30',
    );
    expect(result.applicable).toBe(true);
    const estimate = (result as any).estimate;
    // 6 % от 100 000 + 6 % от 50 000 (самозанятость); касса без режима — по
    // режиму организации, дохода нет — ноль.
    expect(estimate.parts).toEqual([
      expect.objectContaining({ accountId: null, amount: 0 }),
      expect.objectContaining({ accountId: 1, amount: 6000 }),
      expect.objectContaining({ accountId: 2, amount: 3000 }),
    ]);
    expect(estimate.amount).toBe(9000);
  });

  it('счёт с режимом без движения за квартал — в разбивке с нулём', async () => {
    const { service } = build(ACCOUNTS, [], { taxRegime: 'USN_INCOME' });

    const result: any = await service.estimate('2026-05-15');

    expect(result.estimate.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: 1, amount: 0 }),
        expect.objectContaining({ accountId: 2, amount: 0 }),
      ]),
    );
    expect(result.estimate.amount).toBe(0);
  });
});
