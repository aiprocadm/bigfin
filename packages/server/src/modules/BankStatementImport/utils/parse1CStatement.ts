export interface Parsed1CDocument {
  docNumber: string;
  date: string; // ISO 'YYYY-MM-DD'
  amount: number;
  payerAccountNumber: string;
  payeeAccountNumber: string;
  payerName: string;
  payerInn: string;
  payeeName: string;
  payeeInn: string;
  purpose: string;
}

export interface Parsed1CStatement {
  headerAccount: string;
  documents: Parsed1CDocument[];
}

/** 'ДД.ММ.ГГГГ' → 'ГГГГ-ММ-ДД' */
function toIsoDate(ddmmyyyy: string): string {
  const m = (ddmmyyyy || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function parseAmount(raw: string): number {
  const n = parseFloat((raw || '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Разбивает 'Ключ=Значение' (значение может содержать '='). */
function splitKv(line: string): [string, string] | null {
  const i = line.indexOf('=');
  if (i < 0) return null;
  return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
}

export function parse1CStatement(text: string): Parsed1CStatement {
  const lines = text.split(/\r\n|\n|\r/);
  let headerAccount = '';
  const documents: Parsed1CDocument[] = [];
  let cur: Record<string, string> | null = null;

  for (const line of lines) {
    if (line.startsWith('СекцияДокумент')) {
      cur = {};
      continue;
    }
    if (line.startsWith('КонецДокумента')) {
      if (cur) documents.push(mapDocument(cur));
      cur = null;
      continue;
    }
    const kv = splitKv(line);
    if (!kv) continue;
    const [key, value] = kv;
    if (cur) {
      cur[key] = value;
    } else if (key === 'РасчСчет' && !headerAccount) {
      headerAccount = value;
    }
  }
  return { headerAccount, documents };
}

function mapDocument(d: Record<string, string>): Parsed1CDocument {
  return {
    docNumber: d['Номер'] || '',
    date: toIsoDate(d['Дата'] || d['ДатаСписано'] || d['ДатаПоступило'] || ''),
    amount: parseAmount(d['Сумма'] || ''),
    payerAccountNumber: d['ПлательщикРасчСчет'] || d['ПлательщикСчет'] || '',
    payeeAccountNumber: d['ПолучательРасчСчет'] || d['ПолучательСчет'] || '',
    payerName: d['Плательщик1'] || d['Плательщик'] || '',
    payerInn: d['ПлательщикИНН'] || '',
    payeeName: d['Получатель1'] || d['Получатель'] || '',
    payeeInn: d['ПолучательИНН'] || '',
    purpose: d['НазначениеПлатежа'] || '',
  };
}
