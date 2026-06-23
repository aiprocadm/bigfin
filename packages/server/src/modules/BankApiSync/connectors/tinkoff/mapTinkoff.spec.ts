import { mapTinkoffOperation } from './mapTinkoff';

describe('mapTinkoffOperation', () => {
  it('приход (Credit) → положительная сумма, контрагент/ИНН/назначение', () => {
    const op = {
      operationId: 'op-1',
      operationDate: '2026-05-31',
      accountAmount: 150000,
      typeOfOperation: 'Credit',
      payPurpose: 'Оплата по счёту 5',
      documentNumber: '777',
      counterParty: { name: 'ООО Ромашка', inn: '7707083893' },
    };
    expect(mapTinkoffOperation(op)).toEqual({
      date: '2026-05-31',
      amount: 150000,
      payee: 'ООО Ромашка',
      payeeInn: '7707083893',
      externalId: 'tinkoff:op-1',
      referenceNo: '777',
      description: 'Оплата по счёту 5',
    });
  });

  it('расход (Debit) → отрицательная сумма', () => {
    const op = {
      operationId: 2,
      operationDate: '2026-06-01',
      accountAmount: 50000,
      typeOfOperation: 'Debit',
    };
    const r = mapTinkoffOperation(op);
    expect(r.amount).toBe(-50000);
    expect(r.externalId).toBe('tinkoff:2');
    expect(r.payee).toBeNull();
    expect(r.payeeInn).toBeNull();
  });

  it('сумма берётся по модулю и знак по типу (вход всегда положителен)', () => {
    const r = mapTinkoffOperation({
      operationId: 3,
      typeOfOperation: 'Debit',
      accountAmount: -1000,
    });
    expect(r.amount).toBe(-1000);
  });
});
