// © 2026 Bigfin
/**
 * Плановые оплаты заявки на экране (FT-053 ТЗ-3). Те же правила, что
 * проверяет сервер, — чтобы человек видел остаток, пока печатает.
 */
export interface InstallmentRow {
  key: string;
  dueDate: string;
  amount: number | undefined;
  accountId: number | null;
}

const cents = (value: number | undefined) => Math.round(Number(value ?? 0) * 100);

export function installmentsState(amount: number, rows: InstallmentRow[]) {
  const total = rows.reduce((sum, row) => sum + cents(row.amount), 0);
  const remaining = (cents(amount) - total) / 100;
  const complete = rows.every((row) => row.dueDate && cents(row.amount) > 0);
  return {
    total: total / 100,
    remaining,
    // Без оплат заявка — одна дата; с оплатами — только когда сошлись.
    ok: rows.length === 0 || (complete && remaining === 0),
  };
}

/** Строки для сервера: пустые не отправляются. */
export function installmentsPayload(rows: InstallmentRow[]) {
  return rows
    .filter((row) => row.dueDate && cents(row.amount) > 0)
    .map((row) => ({ dueDate: row.dueDate, amount: Number(row.amount), accountId: row.accountId ?? undefined }));
}
