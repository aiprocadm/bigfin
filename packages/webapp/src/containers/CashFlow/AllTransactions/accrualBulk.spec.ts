import { describe, expect, it } from 'vitest';

import { accrualTargets } from './accrualBulk';
import { getMoneyInSchema } from '../MoneyInDialog/v2/MoneyIn.zod';

/** Месяц начисления из реестра и в форме (FT-013 ТЗ-3). */
describe('месяц начисления', () => {
  it('в реестре меняется только у денежных операций; остальные пропущены и посчитаны', () => {
    const rows = [
      { reference_type: 'CashflowTransaction', reference_id: 5 },
      { reference_type: 'CashflowTransaction', reference_id: 5 },
      { reference_type: 'SaleInvoice', reference_id: 9 },
      { referenceType: 'CashflowTransaction', referenceId: 7 },
    ];

    expect(accrualTargets(rows)).toEqual({ ids: [5, 7], skipped: 1 });
  });

  it('в форме: пусто — можно, ГГГГ-ММ — можно, иначе — нельзя', () => {
    const base = {
      date: '2026-01-05',
      amount: '100',
      transaction_type: 'OwnerContribution',
      cashflow_account_id: 1,
      credit_account_id: 2,
      transaction_number: '',
      reference_no: '',
      branch_id: null,
      exchange_rate: '',
      description: '',
    };
    const schema = getMoneyInSchema();

    expect(schema.safeParse({ ...base, accrual_period: '' }).success).toBe(true);
    expect(schema.safeParse({ ...base, accrual_period: '2025-12' }).success).toBe(true);
    expect(schema.safeParse({ ...base, accrual_period: '2025-13' }).success).toBe(false);
    expect(schema.safeParse({ ...base, accrual_period: '12.2025' }).success).toBe(false);
  });
});
