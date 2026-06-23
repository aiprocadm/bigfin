import { Parsed1CDocument } from '@/modules/BankStatementImport/utils/parse1CStatement';

/** 'ГГГГ-ММ-ДД' → 'ДД.ММ.ГГГГ' (инверсия toIsoDate из парсера ⑨). */
const toRuDate = (iso: string): string => {
  const m = (iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
};

/** Сумма числом → строка с двумя знаками (точка-разделитель, формат 1С). */
const fmtAmount = (n: number): string => (Number.isFinite(n) ? n : 0).toFixed(2);

/**
 * Форматирует операции Bigfin в текст `1CClientBankExchange` (㉑) — выгрузка для
 * загрузки в 1С-бухгалтерию. Инверсия парсера ⑨: каждый документ — блок
 * СекцияДокумент…КонецДокумента; ключи совпадают с теми, что читает парсер
 * (round-trip: format → parse возвращает исходные документы).
 */
export const format1CExport = (
  headerAccount: string,
  documents: Parsed1CDocument[],
): string => {
  const lines: string[] = [
    '1CClientBankExchange',
    'ВерсияФормата=1.03',
    'Кодировка=Windows',
    'СекцияРасчСчет',
    `РасчСчет=${headerAccount}`,
    'КонецРасчСчет',
  ];

  for (const d of documents) {
    lines.push(
      'СекцияДокумент=Платежное поручение',
      `Номер=${d.docNumber}`,
      `Дата=${toRuDate(d.date)}`,
      `Сумма=${fmtAmount(d.amount)}`,
      `ПлательщикРасчСчет=${d.payerAccountNumber}`,
      `ПолучательРасчСчет=${d.payeeAccountNumber}`,
      `Плательщик=${d.payerName}`,
      `ПлательщикИНН=${d.payerInn}`,
      `Получатель=${d.payeeName}`,
      `ПолучательИНН=${d.payeeInn}`,
      `НазначениеПлатежа=${d.purpose}`,
      'КонецДокумента',
    );
  }

  lines.push('КонецФайла');
  return lines.join('\r\n');
};
