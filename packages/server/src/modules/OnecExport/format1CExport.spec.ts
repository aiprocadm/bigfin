import { format1CExport } from './format1CExport';
import {
  parse1CStatement,
  Parsed1CDocument,
} from '@/modules/BankStatementImport/utils/parse1CStatement';

const docs: Parsed1CDocument[] = [
  {
    docNumber: '5',
    date: '2026-05-31',
    amount: 150000.5,
    payerAccountNumber: '40702810000000000001',
    payeeAccountNumber: '40702810000000000002',
    payerName: 'ООО Плательщик',
    payerInn: '7707083893',
    payeeName: 'ООО Получатель',
    payeeInn: '7707083894',
    purpose: 'Оплата по счёту 5',
  },
];

describe('format1CExport', () => {
  it('round-trip: format → parse возвращает исходные документы', () => {
    const text = format1CExport('40702810000000000001', docs);
    const parsed = parse1CStatement(text);

    expect(parsed.headerAccount).toBe('40702810000000000001');
    expect(parsed.documents).toHaveLength(1);
    expect(parsed.documents[0]).toEqual({
      docNumber: '5',
      date: '2026-05-31',
      amount: 150000.5,
      payerAccountNumber: '40702810000000000001',
      payeeAccountNumber: '40702810000000000002',
      payerName: 'ООО Плательщик',
      payerInn: '7707083893',
      payeeName: 'ООО Получатель',
      payeeInn: '7707083894',
      purpose: 'Оплата по счёту 5',
    });
  });

  it('заголовок содержит сигнатуру формата и КонецФайла', () => {
    const text = format1CExport('123', []);
    expect(text.startsWith('1CClientBankExchange')).toBe(true);
    expect(text).toContain('РасчСчет=123');
    expect(text.trimEnd().endsWith('КонецФайла')).toBe(true);
  });
});
