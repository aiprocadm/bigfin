// © 2026 Bigfin
import { describe, expect, it } from 'vitest';

import { bulkPayload, emptyBulkRow, remainingAfterResult, type BulkRow } from './bulkEntry';

/** FT-024 ТЗ-3: 10 операций одним запросом; ошибка строки 7 объяснена. */
describe('пакетный ввод «Несколько»', () => {
  const rows = (count: number): BulkRow[] =>
    Array.from({ length: count }, (_, i) => ({
      ...emptyBulkRow('2026-09-10'),
      amount: 100 + i,
      creditAccountId: 1021,
      description: `строка ${i + 1}`,
    }));

  it('10 строк — 10 операций одного запроса, общие поля в каждой', () => {
    const payload = bulkPayload({ cashflowAccountId: 1000, flow: 'out' }, rows(10));
    expect(payload).toHaveLength(10);
    expect(payload[0]).toEqual({
      date: '2026-09-10',
      amount: 100,
      transaction_type: 'other_expense',
      cashflow_account_id: 1000,
      credit_account_id: 1021,
      description: 'строка 1',
      exchange_rate: 1,
      publish: true,
    });
    expect(bulkPayload({ cashflowAccountId: 1000, flow: 'in' }, rows(1))[0].transaction_type).toBe('other_income');
  });

  it('пустые строки не уходят на сервер', () => {
    expect(bulkPayload({ cashflowAccountId: 1000, flow: 'out' }, [...rows(2), emptyBulkRow('2026-09-10')])).toHaveLength(2);
  });

  it('после ответа в окне остаётся только седьмая — со своей ошибкой', () => {
    const list = rows(10);
    const results = list.map((_, index) =>
      index === 6 ? { index, error: 'X', message: 'Счёт не того вида' } : { index, id: 100 + index },
    );
    const remaining = remainingAfterResult(list, results, () => '');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ description: 'строка 7', error: 'Счёт не того вида' });
  });

  it('недозаполненная строка называет поля словами', () => {
    const list = rows(1);
    const remaining = remainingAfterResult(
      list,
      [{ index: 0, error: 'VALIDATION_FAILED', fields: ['creditAccountId'] }],
      (fields) => `Не заполнено: ${fields.join(', ')}`,
    );
    expect(remaining[0].error).toBe('Не заполнено: creditAccountId');
  });
});
