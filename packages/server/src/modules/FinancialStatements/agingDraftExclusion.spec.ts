import * as knexLib from 'knex';
import { SaleInvoice } from '@/modules/SaleInvoices/models/SaleInvoice';
import { Bill } from '@/modules/Bills/models/Bill';

/**
 * О1 (карта v13): дебиторка и кредиторка по срокам должны считать ТОЛЬКО
 * проведённые документы. Раньше aging-модификаторы фильтровали лишь остаток
 * (`has due`), и черновой счёт (delivered_at IS NULL) с балансом попадал в
 * отчёт о долгах, расходясь с Балансом (тот считает по проведённым).
 *
 * Проверяем на уровне SQL, что модификаторы теперь требуют проведённость.
 */
const knex = (knexLib as any)({ client: 'mysql2' });

const sqlOf = (model: any, modifier: string) =>
  model
    .query(knex)
    .modify(modifier, '2026-06-05')
    .toKnexQuery()
    .toString()
    .toLowerCase();

describe('aging исключает черновики (О1)', () => {
  it('dueInvoicesFromDate требует проведённость счёта (delivered_at)', () => {
    expect(sqlOf(SaleInvoice, 'dueInvoicesFromDate')).toContain('delivered_at');
  });

  it('overdueInvoicesFromDate требует проведённость счёта', () => {
    expect(sqlOf(SaleInvoice, 'overdueInvoicesFromDate')).toContain('delivered_at');
  });

  it('dueBillsFromDate требует проведённость счёта поставщика (opened_at)', () => {
    expect(sqlOf(Bill, 'dueBillsFromDate')).toContain('opened_at');
  });

  it('overdueBillsFromDate требует проведённость счёта поставщика', () => {
    expect(sqlOf(Bill, 'overdueBillsFromDate')).toContain('opened_at');
  });
});
