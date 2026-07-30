import { mapAlfaOperation } from './mapAlfa';

describe('mapAlfaOperation', () => {
  it('приход → положительная сумма, контрагент/ИНН/назначение', () => {
    const op = {
      id: 'a-1',
      date: '2026-05-31',
      amount: 150000,
      direction: 'CREDIT',
      purpose: 'Оплата по счёту 5',
      documentNumber: '777',
      counterparty: { name: 'ООО Ромашка', inn: '7707083893' },
    };

    expect(mapAlfaOperation(op)).toEqual({
      date: '2026-05-31',
      amount: 150000,
      payee: 'ООО Ромашка',
      payeeInn: '7707083893',
      externalId: 'alfa:a-1',
      referenceNo: '777',
      description: 'Оплата по счёту 5',
    });
  });

  it('расход → отрицательная сумма', () => {
    const op = {
      id: 2,
      date: '2026-06-01',
      amount: 50000,
      direction: 'DEBIT',
      counterparty: { name: 'ООО Поставщик' },
    };

    const rec = mapAlfaOperation(op);
    expect(rec.amount).toBe(-50000);
    expect(rec.externalId).toBe('alfa:2');
    expect(rec.payeeInn).toBeNull();
  });

  it('сумма всегда по модулю от направления, знак минус не удваивается', () => {
    expect(mapAlfaOperation({ id: 3, amount: -700, direction: 'DEBIT' }).amount)
      .toBe(-700);
    expect(mapAlfaOperation({ id: 4, amount: -700, direction: 'CREDIT' }).amount)
      .toBe(700);
  });

  it('пустые и битые поля не роняют маппер', () => {
    const rec = mapAlfaOperation({});
    expect(rec.amount).toBe(0);
    expect(rec.payee).toBeNull();
    expect(rec.referenceNo).toBeNull();
    expect(rec.description).toBeNull();
  });
});
