// © 2026 Bigfin
import { ServiceError } from '@/modules/Items/ServiceError';
import { SetAccrualPeriodService } from './SetAccrualPeriod.service';

/**
 * Массовое проставление месяца начисления (FT-013 ТЗ-3).
 */
function makeService(options: { lockedUntil?: string } = {}) {
  const patches: Array<{ table: string; filter: any; values: any }> = [];
  const transactions = [
    { id: 1, date: '2026-01-05', accrualPeriod: null },
    { id: 2, date: '2026-01-20', accrualPeriod: null },
  ];
  const builder = (table: string, rows: any[]) => () => ({
    query: () => {
      const filter: any = {};
      const qb: any = {
        whereIn: (column: string, values: any[]) => {
          filter[column] = values;
          return qb;
        },
        where: (column: string, value: any) => {
          filter[column] = value;
          return qb;
        },
        patch: async (values: any) => {
          patches.push({ table, filter: { ...filter }, values });
          return 1;
        },
        then: (resolve: any) =>
          resolve(rows.filter((row) => !filter.id || filter.id.includes(row.id))),
      };
      return qb;
    },
  });
  const locking = {
    validateTransactionsLocking: async (date: any) => {
      const day = typeof date === 'string' ? date : date.format('YYYY-MM-DD');
      if (options.lockedUntil && day <= options.lockedUntil) {
        throw new ServiceError('TRANSACTIONS_DATE_LOCKED');
      }
    },
  };
  const service = new SetAccrualPeriodService(
    builder('cashflow_transactions', transactions) as any,
    builder('accounts_transactions', []) as any,
    locking as any,
  );
  return { service, patches };
}

describe('месяц начисления нескольким операциям', () => {
  it('пишется и в документы, и в их проводки', async () => {
    const { service, patches } = makeService();

    const result = await service.setAccrualPeriod([1, 2, 2], '2025-12');

    expect(result).toEqual({ updated: 2 });
    expect(patches).toEqual([
      { table: 'cashflow_transactions', filter: { id: [1, 2] }, values: { accrualPeriod: '2025-12' } },
      {
        table: 'accounts_transactions',
        filter: { referenceType: 'CashflowTransaction', referenceId: [1, 2] },
        values: { accrualPeriod: '2025-12' },
      },
    ]);
  });

  it('снять месяц — null, операция вернётся в месяц платежа', async () => {
    const { service, patches } = makeService();

    await service.setAccrualPeriod([1], null);

    expect(patches[0].values).toEqual({ accrualPeriod: null });
  });

  it('не в виде ГГГГ-ММ — понятный отказ', async () => {
    const { service } = makeService();

    await expect(service.setAccrualPeriod([1], '12.2025')).rejects.toMatchObject({
      errorType: 'ACCRUAL_PERIOD_INVALID',
    });
  });

  it('перенос в закрытый период — отказ, ничего не записано', async () => {
    const { service, patches } = makeService({ lockedUntil: '2025-12-31' });

    await expect(service.setAccrualPeriod([1], '2025-11')).rejects.toBeInstanceOf(ServiceError);
    expect(patches).toEqual([]);
  });
});
