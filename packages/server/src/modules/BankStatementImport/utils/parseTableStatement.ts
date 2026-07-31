import { createHash } from 'crypto';
import * as XLSX from 'xlsx';

/**
 * Разбор банковской выписки, выгруженной таблицей (⑨a): `.csv`, `.xlsx`, `.xls`.
 * Колонки распознаются по заголовку — шаблонов под конкретные банки нет.
 * Библиотека `xlsx` уже в прямых зависимостях (модуль Import), новых нет.
 */

/**
 * CSV приходят и в UTF-8 (выгрузки из веб-банков), и в windows-1251 (1С и
 * старые банк-клиенты). BOM разбираем явно, иначе пробуем строгий UTF-8:
 * кириллица в 1251 почти всегда даёт недопустимые последовательности UTF-8,
 * поэтому отказ декодера — надёжный признак 1251.
 */
export function decodeTextBuffer(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString('utf8');
  }
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buf.slice(2));
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1251').decode(buf);
  }
}

export const STATEMENT_TABLE_ERRORS = {
  COLUMNS_NOT_RECOGNIZED: 'STATEMENT_COLUMNS_NOT_RECOGNIZED',
};

export interface ParsedTableRow {
  date: string;
  /** Знаковая: приход > 0, расход < 0. */
  amount: number;
  payee: string | null;
  payeeInn: string | null;
  referenceNo: string | null;
  description: string | null;
  externalId: string;
}

export interface ParsedTableStatement {
  rows: ParsedTableRow[];
  /** Строки, которые не удалось разобрать (нет даты или суммы). */
  skipped: number;
  /** Распознанные заголовки — показываем в предпросмотре. */
  columns: Record<string, string>;
  warnings: string[];
}

type ColumnKey =
  | 'date'
  | 'amount'
  | 'income'
  | 'outcome'
  | 'description'
  | 'payee'
  | 'inn'
  | 'docNumber'
  | 'operationType';

// Порядок важен: более узкие синонимы проверяются раньше общих
// («дата операции» перед «дата», «инн» перед «контрагент»).
const SYNONYMS: Array<[ColumnKey, string[]]> = [
  ['inn', ['инн', 'inn']],
  ['docNumber', ['номер документа', '№ док', 'номер док', 'номер', 'number']],
  ['operationType', ['вид операции', 'тип операции', 'тип', 'operation type']],
  ['income', ['приход', 'поступление', 'зачисление', 'кредит', 'credit']],
  ['outcome', ['расход', 'списание', 'дебет', 'debit']],
  ['date', ['дата операции', 'дата проводки', 'дата', 'date']],
  ['amount', ['сумма', 'amount']],
  [
    'description',
    ['назначение', 'основание', 'описание', 'purpose', 'description'],
  ],
  [
    'payee',
    ['контрагент', 'плательщик', 'получатель', 'counterparty', 'payee'],
  ],
];

const OUTCOME_MARKERS = ['списан', 'расход', 'debit', 'дебет', 'выдача'];

const norm = (v: unknown): string =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/** Ищет для каждой колонки её смысл по заголовку. */
function detectColumns(header: unknown[]): Partial<Record<ColumnKey, number>> {
  const found: Partial<Record<ColumnKey, number>> = {};

  header.forEach((cell, index) => {
    const title = norm(cell);
    if (!title) return;

    for (const [key, variants] of SYNONYMS) {
      if (found[key] !== undefined) continue;
      if (variants.some((v) => title.includes(v))) {
        found[key] = index;
        return;
      }
    }
  });
  return found;
}

const hasDateAndAmount = (c: Partial<Record<ColumnKey, number>>): boolean =>
  c.date !== undefined &&
  (c.amount !== undefined || c.income !== undefined || c.outcome !== undefined);

/** Excel хранит даты числом дней от 30.12.1899. */
function fromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0 || serial > 100000) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function parseDateCell(cell: unknown): string | null {
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);

  const raw = String(cell ?? '').trim();
  if (!raw) return null;

  let m = raw.match(/^(\d{2})[.\/](\d{2})[.\/](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;

  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  if (/^\d+([.,]\d+)?$/.test(raw)) {
    return fromExcelSerial(Number(raw.replace(',', '.')));
  }
  return null;
}

export function parseAmountCell(cell: unknown): number | null {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;

  const raw = String(cell ?? '')
    // неразрывные и обычные пробелы — разделители разрядов
    .replace(/[\s  ]/g, '')
    .replace(/[₽$€руб.]/gi, (match) => (match === '.' ? '.' : ''))
    .replace(',', '.')
    .trim();
  if (!raw) return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

const cell = (row: unknown[], index?: number): unknown =>
  index === undefined ? undefined : row[index];

const textOrNull = (row: unknown[], index?: number): string | null => {
  const value = String(cell(row, index) ?? '').trim();
  return value ? value : null;
};

export function parseTableStatement(
  buffer: Buffer,
  fileName: string,
): ParsedTableStatement {
  const isCsv = fileName.toLowerCase().endsWith('.csv');
  // CSV декодируем сами (банки шлют windows-1251), xlsx — двоичный.
  const workbook = isCsv
    ? XLSX.read(decodeTextBuffer(buffer), { type: 'string', raw: true })
    : XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const table: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  let headerIndex = -1;
  let columns: Partial<Record<ColumnKey, number>> = {};

  for (let i = 0; i < Math.min(table.length, 20); i += 1) {
    const candidate = detectColumns(table[i] ?? []);
    if (hasDateAndAmount(candidate)) {
      headerIndex = i;
      columns = candidate;
      break;
    }
  }

  if (headerIndex === -1) {
    const seen = (table[0] ?? []).map((c) => String(c ?? '')).filter(Boolean);
    throw new Error(
      `${STATEMENT_TABLE_ERRORS.COLUMNS_NOT_RECOGNIZED}: не найдены колонки даты и суммы. ` +
        `Найденные заголовки: ${seen.join(', ') || '(пусто)'}`,
    );
  }

  const rows: ParsedTableRow[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  let sawNegative = false;
  let sawOperationType = false;

  for (let i = headerIndex + 1; i < table.length; i += 1) {
    const row = table[i] ?? [];
    const date = parseDateCell(cell(row, columns.date));

    let amount: number | null = null;
    if (columns.income !== undefined || columns.outcome !== undefined) {
      const income = parseAmountCell(cell(row, columns.income));
      const outcome = parseAmountCell(cell(row, columns.outcome));
      if (income) amount = Math.abs(income);
      else if (outcome) amount = -Math.abs(outcome);
    } else {
      amount = parseAmountCell(cell(row, columns.amount));
      if (amount !== null && amount < 0) sawNegative = true;

      const type = norm(cell(row, columns.operationType));
      if (type) {
        sawOperationType = true;
        if (OUTCOME_MARKERS.some((marker) => type.includes(marker))) {
          amount = -Math.abs(amount ?? 0);
        }
      }
    }

    if (!date || !amount) {
      skipped += 1;
      continue;
    }

    const docNumber = textOrNull(row, columns.docNumber);
    const description = textOrNull(row, columns.description);
    const fingerprint = createHash('sha1')
      .update(`${date}|${amount.toFixed(2)}|${docNumber ?? ''}|${description ?? ''}`)
      .digest('hex')
      .slice(0, 16);

    rows.push({
      date,
      amount,
      payee: textOrNull(row, columns.payee),
      payeeInn: textOrNull(row, columns.inn),
      referenceNo: docNumber,
      description,
      externalId: `table:${fingerprint}`,
    });
  }

  // Одна колонка суммы, ни одного минуса и нет вида операции — знак угадан.
  const singleAmountColumn =
    columns.income === undefined && columns.outcome === undefined;
  if (singleAmountColumn && !sawNegative && !sawOperationType && rows.length) {
    warnings.push('amountSignAssumed');
  }

  const columnTitles: Record<string, string> = {};
  const header = table[headerIndex] ?? [];
  for (const [key, index] of Object.entries(columns)) {
    columnTitles[key] = String(header[index as number] ?? '');
  }

  return { rows, skipped, columns: columnTitles, warnings };
}
