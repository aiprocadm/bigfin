// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import {
  clonePrefill,
  recurringDraftFromRow,
  REGISTRY_ROW_ACTIONS,
  registryRowActions,
  ruleDraftFromRow,
} from './registryRowActions';

/**
 * FT-022 ТЗ-3: девять действий; каждое либо выполняется, либо объясняет,
 * почему недоступно.
 */
describe('меню операции в реестре', () => {
  const cashflow = { reference_type: 'CashflowTransaction' };
  const payment = { reference_type: 'PaymentReceive' };

  it('девять пунктов, у недоступного всегда есть объяснение', () => {
    for (const row of [cashflow, payment]) {
      for (const projectsEnabled of [true, false]) {
        const actions = registryRowActions(row, { projectsEnabled });
        expect(actions.map((a) => a.id)).toEqual([...REGISTRY_ROW_ACTIONS]);
        actions
          .filter((a) => !a.available)
          .forEach((a) => expect(a.reasonKey).toMatch(/^all_transactions\.actions\.reason\./));
      }
    }
  });

  it('денежной операции доступно всё', () => {
    expect(registryRowActions(cashflow, { projectsEnabled: true }).every((a) => a.available)).toBe(true);
  });

  it('оплата счёта правится в своём документе; метка, история и правило — можно', () => {
    const actions = registryRowActions(payment, { projectsEnabled: true });
    const available = actions.filter((a) => a.available).map((a) => a.id);
    expect(available).toEqual(['create_rule', 'make_recurring', 'history', 'tag']);
  });

  it('модуль сделок выключен — пункт объясняет это, а не молчит', () => {
    const deal = registryRowActions(cashflow, { projectsEnabled: false }).find((a) => a.id === 'link_deal');
    expect(deal).toEqual({ id: 'link_deal', available: false, reasonKey: 'all_transactions.actions.reason.deals_off' });
  });

  it('черновик правила: счёт, направление и условие из строки', () => {
    expect(ruleDraftFromRow({ account_id: 1000, deposit: 0, withdrawal: 500, contact_name: 'ООО Озон' })).toMatchObject({
      name: 'ООО Озон',
      applyIfAccountId: 1000,
      applyIfTransactionType: 'withdrawal',
      conditions: [{ field: 'payee', comparator: 'contains', value: 'ООО Озон' }],
    });
    expect(ruleDraftFromRow({ account_id: 1000, deposit: 700, note: 'Оплата по счёту 15 от 01.09' }).conditions).toEqual([
      { field: 'description', comparator: 'contains', value: 'Оплата по счёту 15' },
    ]);
  });

  it('черновик повторяющейся: сумма, счёт, ежемесячно', () => {
    expect(recurringDraftFromRow({ account_id: 1000, deposit: 0, withdrawal: 1500, note: 'Аренда' }, '2026-10-05')).toEqual({
      direction: 'outflow',
      amount: 1500,
      plannedDate: '2026-10-05',
      accountId: 1000,
      contactId: null,
      description: 'Аренда',
      recurrence: { frequency: 'monthly', interval: 1 },
    });
  });

  it('копия: окно по направлению, вид в написании формы, сумма и статья те же', () => {
    expect(
      clonePrefill({
        transaction_type: 'OtherExpense',
        amount: 1500,
        cashflow_account_id: 1000,
        cashflow_account: { name: 'Расчётный счёт' },
        credit_account_id: 1021,
        description: 'Аренда',
      }),
    ).toEqual({
      dialog: 'money-out',
      accountId: 1000,
      accountName: 'Расчётный счёт',
      prefill: { amount: '1500', transaction_type: 'other_expense', credit_account_id: 1021, description: 'Аренда' },
    });
    expect(clonePrefill({ transaction_type: 'TransferFromAccount', amount: 5 }).dialog).toBe('money-in');
    expect(clonePrefill({ transaction_type: 'owner_drawing', amount: 5 }).dialog).toBe('money-out');
  });
});
