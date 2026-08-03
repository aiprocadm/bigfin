import { transformLedgerEntryToTransaction } from './utils';

/**
 * Проводка книги → запись в оборотах счёта (㉔). Здесь легко перепутать
 * поля: тип/номер документа хранятся в двух парах полей (reference* и
 * transaction*), и путаница ломает и отчёты, и сторнирование.
 */
const entry = {
  date: '2026-06-15',
  credit: 500,
  debit: 0,
  currencyCode: 'USD',
  exchangeRate: 90,
  accountId: 7,
  contactId: 11,
  transactionType: 'SaleInvoice',
  transactionId: 123,
  transactionNumber: 'INV-1',
  transactionSubType: 'Payment',
  referenceNumber: 'REF-9',
  note: 'комментарий',
  index: 2,
  indexGroup: 1,
  branchId: 4,
  userId: 6,
  itemId: 8,
  projectId: 9,
  costable: true,
  taxRateId: 3,
  taxRate: 20,
} as any;

describe('transformLedgerEntryToTransaction', () => {
  it('переносит суммы и валюту без изменений', () => {
    const tx = transformLedgerEntryToTransaction(entry);

    expect(tx.credit).toBe(500);
    expect(tx.debit).toBe(0);
    expect(tx.currencyCode).toBe('USD');
    expect(tx.exchangeRate).toBe(90);
  });

  it('документ-источник попадает в reference-поля, а вид операции — в transaction-поля', () => {
    const tx = transformLedgerEntryToTransaction(entry);

    // Тип и id самого документа.
    expect(tx.referenceType).toBe('SaleInvoice');
    expect(tx.referenceId).toBe(123);
    // Вид операции внутри документа — отдельное поле, не путать с типом.
    expect(tx.transactionType).toBe('Payment');
    expect(tx.transactionNumber).toBe('INV-1');
    expect(tx.referenceNumber).toBe('REF-9');
  });

  it('дата приводится к объекту даты', () => {
    const tx = transformLedgerEntryToTransaction(entry);

    expect(tx.date).toBeInstanceOf(Date);
    expect((tx.date as Date).toISOString().slice(0, 10)).toBe('2026-06-15');
  });

  it('переносит аналитику: счёт, контрагент, филиал, проект, товар', () => {
    const tx = transformLedgerEntryToTransaction(entry);

    expect(tx).toMatchObject({
      accountId: 7,
      contactId: 11,
      branchId: 4,
      projectId: 9,
      itemId: 8,
      userId: 6,
    });
  });

  it('переносит признак себестоимости и налоговые поля', () => {
    const tx = transformLedgerEntryToTransaction(entry);

    expect(tx.costable).toBe(true);
    expect(tx.taxRateId).toBe(3);
    expect(tx.taxRate).toBe(20);
  });

  it('порядковые поля сохраняются — от них зависит порядок в отчётах', () => {
    const tx = transformLedgerEntryToTransaction(entry);

    expect(tx.index).toBe(2);
    expect(tx.indexGroup).toBe(1);
  });
});
