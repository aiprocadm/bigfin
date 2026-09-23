// © 2026 Bigfin
import { parse1CStatement } from '@/modules/BankStatementImport/utils/parse1CStatement';
import { opsFrom1C, reconcile, reconciliationDiff } from './reconcile';

describe('сверка с банком (FT-040, FT-041)', () => {
  const bank = [
    { date: '2026-06-01', amount: 1000, externalId: 'tinkoff:1' },
    { date: '2026-06-02', amount: -250.4, externalId: 'tinkoff:2' },
    { date: '2026-06-03', amount: -150, externalId: null },
    { date: '2026-06-03', amount: -150, externalId: null },
    { date: '2026-06-05', amount: -999, externalId: 'tinkoff:5' },
  ];

  it('совпадение по номеру у банка и по тройке «дата, сумма, направление»', () => {
    const result = reconcile(bank, [
      { kind: 'bank_line', id: 1, date: '2026-06-01', amount: 1000, externalId: 'tinkoff:1' },
      { kind: 'cashflow', id: 7, date: '2026-06-02', amount: -250.4 },
      { kind: 'cashflow', id: 8, date: '2026-06-03', amount: -150 },
      { kind: 'bank_line', id: 9, date: '2026-06-04', amount: -40, externalId: 'x' },
    ]);
    // Две одинаковые комиссии — две строки: одна наша совпала, вторая — нет.
    expect(result.missingHere.map((i) => [i.op.date, i.op.amount])).toEqual([
      ['2026-06-03', -150],
      ['2026-06-05', -999],
    ]);
    expect(result.missingBank.map((l) => l.id)).toEqual([9]);
  });

  it('направление важно: поступление 150 не совпадает со списанием 150', () => {
    const result = reconcile([{ date: '2026-06-03', amount: 150, externalId: null }], [
      { kind: 'cashflow', id: 1, date: '2026-06-03', amount: -150 },
    ]);
    expect(result.missingHere).toHaveLength(1);
    expect(result.missingBank).toHaveLength(1);
  });

  it('документы разных разделов с одним номером — разные строки', () => {
    // Живой случай стенда: дивиденды №1, оплата покупателя №1 и оплата
    // поставщику №1. Пара для дивидендов не должна «занимать» оплаты.
    const result = reconcile(
      [
        { date: '2026-08-04', amount: -100000, externalId: null },
        { date: '2026-07-30', amount: 100000, externalId: null },
        { date: '2026-07-30', amount: -50000, externalId: null },
      ],
      [
        { kind: 'document', refType: 'DividendPayout', id: 1, date: '2026-08-04', amount: -100000 },
        { kind: 'document', refType: 'PaymentReceive', id: 1, date: '2026-07-30', amount: 100000 },
        { kind: 'document', refType: 'BillPayment', id: 1, date: '2026-07-30', amount: -50000 },
        { kind: 'document', refType: 'Expense', id: 1, date: '2026-07-31', amount: -700 },
      ],
    );
    expect(result.missingHere).toEqual([]);
    expect(result.missingBank.map((l) => l.refType)).toEqual(['Expense']);
  });

  it('допуск 0 дней: тот же платёж днём позже — не пара', () => {
    const result = reconcile([{ date: '2026-06-03', amount: -150, externalId: null }], [
      { kind: 'cashflow', id: 1, date: '2026-06-04', amount: -150 },
    ]);
    expect(result.missingHere).toHaveLength(1);
  });

  it('строка банка, удалённая у нас вручную, помечена «была удалена»', () => {
    const result = reconcile(
      [{ date: '2026-06-05', amount: -999, externalId: 'tinkoff:5' }],
      [],
      [{ kind: 'bank_line', id: 3, date: '2026-06-05', amount: -999, externalId: 'tinkoff:5', deletedAt: '2026-06-10 12:00:00', deletedBy: 'Иван' }],
    );
    expect(result.missingHere[0].deleted).toMatchObject({ id: 3, deletedBy: 'Иван' });
  });

  it('всё сходится — расхождений нет (FT-041)', () => {
    const ours = bank.map((op, i) => ({ kind: 'bank_line' as const, id: i + 1, ...op }));
    const result = reconcile(bank, ours);
    expect(result).toEqual({ missingHere: [], missingBank: [] });
    expect(reconciliationDiff(null, 0, result)).toBe(0);
  });

  it('расхождение: по остаткам, а без остатка банка — по операциям', () => {
    const result = reconcile(bank, []);
    expect(reconciliationDiff(591240, 583985.12, result)).toBe(7254.88);
    // Без остатка банка: сумма строк «есть в банке, нет у нас».
    expect(reconciliationDiff(null, 0, result)).toBe(1000 - 250.4 - 150 - 150 - 999);
  });

  it('выписка 1С: номер строки и знак — как у импорта, остатки читаются', () => {
    const file = [
      '1CClientBankExchange',
      'ДатаНачала=01.06.2026',
      'ДатаКонца=30.06.2026',
      'РасчСчет=40702810400000012345',
      'НачальныйОстаток=1000.00',
      'КонечныйОстаток=1750.00',
      'СекцияДокумент=Платежное поручение',
      'Номер=101',
      'Дата=15.06.2026',
      'Сумма=1000.00',
      'ПлательщикРасчСчет=40702810400000099999',
      'ПолучательРасчСчет=40702810400000012345',
      'КонецДокумента',
      'СекцияДокумент=Платежное поручение',
      'Номер=102',
      'Дата=16.06.2026',
      'Сумма=250.00',
      'ПлательщикРасчСчет=40702810400000012345',
      'ПолучательРасчСчет=40817810400000055555',
      'КонецДокумента',
      'КонецФайла',
    ].join('\r\n');
    const parsed = parse1CStatement(file);
    expect(parsed.balances).toEqual({ from: '2026-06-01', to: '2026-06-30', opening: 1000, closing: 1750 });
    expect(opsFrom1C(parsed, '40702810400000012345')).toEqual([
      expect.objectContaining({ date: '2026-06-15', amount: 1000, externalId: '1c:101:2026-06-15:1000.00' }),
      expect.objectContaining({ date: '2026-06-16', amount: -250, externalId: '1c:102:2026-06-16:250.00' }),
    ]);
  });
});
