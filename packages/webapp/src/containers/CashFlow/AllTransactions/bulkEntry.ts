// © 2026 Bigfin
/**
 * Пакетный ввод «Несколько» (FT-024 ТЗ-3): общие поля сверху, N строк ниже,
 * один запрос. AC: при ошибке в строке 7 первые 6 сохраняются, а человек
 * видит, что не так с седьмой. Логика без React — её держат тесты.
 */

export interface BulkCommon {
  /** Денежный счёт, куда пришли или откуда ушли деньги. */
  cashflowAccountId: number | null;
  /** Поступление или выплата — вид операции для всех строк. */
  flow: 'in' | 'out';
}

export interface BulkRow {
  key: string;
  date: string;
  amount: number | undefined;
  /** Встречный счёт: статья дохода или расхода. */
  creditAccountId: number | null;
  description: string;
  /** Ошибка сервера для этой строки — показывается под ней. */
  error?: string;
}

let seq = 0;
export const emptyBulkRow = (date: string): BulkRow => ({
  key: `r${(seq += 1)}`,
  date,
  amount: undefined,
  creditAccountId: null,
  description: '',
});

/** Строка без суммы, статьи и описания — это не операция, а пустое место. */
const isBlank = (row: BulkRow) => !row.amount && !row.creditAccountId && !row.description.trim();

/** Строки, которые уйдут на сервер, — в том же порядке, что на экране. */
export const filledRows = (rows: BulkRow[]) => rows.filter((row) => !isBlank(row));

export function bulkPayload(common: BulkCommon, rows: BulkRow[]) {
  return filledRows(rows).map((row) => ({
    date: row.date,
    amount: Number(row.amount ?? 0),
    transaction_type: common.flow === 'in' ? 'other_income' : 'other_expense',
    cashflow_account_id: common.cashflowAccountId,
    credit_account_id: row.creditAccountId,
    description: row.description,
    exchange_rate: 1,
    publish: true,
  }));
}

export interface BulkResultRow {
  index: number;
  id?: number;
  error?: string;
  message?: string;
  fields?: string[];
}

/**
 * Что остаётся в окне после ответа: только строки с ошибками, каждая со
 * своим объяснением. Сохранённые уходят — повторное нажатие не создаст их
 * второй раз.
 */
export function remainingAfterResult(
  rows: BulkRow[],
  results: BulkResultRow[],
  describeFields: (fields: string[]) => string,
): BulkRow[] {
  const filled = filledRows(rows);
  return results
    .filter((result) => result.id === undefined)
    .map((result) => {
      const row = filled[result.index];
      if (!row) return null;
      const error = result.fields?.length ? describeFields(result.fields) : result.message ?? '';
      return { ...row, error };
    })
    .filter((row): row is BulkRow & { error: string } => row !== null);
}
