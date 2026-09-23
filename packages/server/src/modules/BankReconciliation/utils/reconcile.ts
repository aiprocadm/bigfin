// © 2026 Bigfin
import { Parsed1CStatement } from '@/modules/BankStatementImport/utils/parse1CStatement';
import { ParsedTableStatement } from '@/modules/BankStatementImport/utils/parseTableStatement';
import {
  buildExternalId,
  makeExternalIdDeduper,
  resolveDirection,
} from '@/modules/BankStatementImport/utils/statementHelpers';

/**
 * Сверка счёта с банком (FT-040, FT-041 ТЗ-3) — логика без базы.
 */

/** Операция банка: сумма со знаком (+ поступление, − списание). */
export interface StatementOp {
  date: string;
  amount: number;
  externalId: string | null;
  payee?: string | null;
  description?: string | null;
}

/** Наша операция на счёте: строка выписки или денежная операция без неё. */
export interface OurLine {
  /** document — документ другого раздела (оплата счёта, расход, проводка). */
  kind: 'bank_line' | 'cashflow' | 'document';
  id: number;
  date: string;
  amount: number;
  externalId?: string | null;
  payee?: string | null;
  description?: string | null;
}

export interface DeletedLine extends OurLine {
  deletedAt: string;
  deletedBy: string | number | null;
}

export interface ReconcileResult {
  /** Есть в банке, нет у нас. `deleted` — у нас была, но её удалили. */
  missingHere: Array<{ op: StatementOp; deleted?: DeletedLine }>;
  /** Есть у нас, нет в банке. */
  missingBank: OurLine[];
}

const day = (value: string) => String(value).slice(0, 10);
const cents = (value: number) => Math.round(Number(value) * 100);
const tripleKey = (date: string, amount: number) => `${day(date)}|${cents(amount)}`;

/**
 * Операции банка по выписке 1С — ТЕМ ЖЕ способом, что импорт: тот же номер
 * строки у банка и тот же знак. Иначе сверка не узнала бы строки, которые
 * импорт уже положил.
 */
export function opsFrom1C(parsed: Parsed1CStatement, ourAccount: string): StatementOp[] {
  const dedupe = makeExternalIdDeduper();
  const ops: StatementOp[] = [];
  for (const doc of parsed.documents) {
    const resolved = resolveDirection(doc, ourAccount || parsed.headerAccount);
    if (resolved.direction === 'unknown') continue;
    ops.push({
      date: doc.date,
      amount: resolved.direction === 'in' ? doc.amount : -doc.amount,
      externalId: dedupe(buildExternalId(doc)),
      payee: resolved.counterpartyName || null,
      description: doc.purpose || null,
    });
  }
  return ops;
}

export function opsFromTable(parsed: ParsedTableStatement): StatementOp[] {
  return parsed.rows.map((row) => ({
    date: row.date,
    amount: row.amount,
    externalId: row.externalId,
    payee: row.payee,
    description: row.description,
  }));
}

/**
 * Сопоставление: сначала по номеру строки у банка, при его отсутствии — по
 * тройке «дата, сумма, направление» (знак суммы) с допуском 0 дней. Каждая
 * наша строка совпадает не больше чем с одной банковской — две одинаковые
 * комиссии за день остаются двумя.
 *
 * Банковская строка без пары, но совпавшая с удалённой у нас, помечается:
 * человек видит «была удалена такого-то числа таким-то», а не «пропала».
 */
export function reconcile(
  bank: StatementOp[],
  ours: OurLine[],
  deleted: DeletedLine[] = [],
): ReconcileResult {
  const used = new Set<string>();
  const keyOf = (line: OurLine) => `${line.kind}:${line.id}`;
  const byExternal = new Map<string, OurLine[]>();
  const byTriple = new Map<string, OurLine[]>();
  for (const line of ours) {
    if (line.externalId) {
      byExternal.set(line.externalId, [...(byExternal.get(line.externalId) ?? []), line]);
    }
    const key = tripleKey(line.date, line.amount);
    byTriple.set(key, [...(byTriple.get(key) ?? []), line]);
  }
  const take = (candidates: OurLine[] | undefined) =>
    (candidates ?? []).find((line) => !used.has(keyOf(line)));

  const unmatched: StatementOp[] = [];
  // Первый проход — только по номеру у банка: иначе строка, совпавшая по
  // тройке, могла бы занять чужую пару с точным номером.
  const pending: StatementOp[] = [];
  for (const op of bank) {
    const exact = op.externalId ? take(byExternal.get(op.externalId)) : undefined;
    if (exact) used.add(keyOf(exact));
    else pending.push(op);
  }
  for (const op of pending) {
    const byTripleMatch = take(byTriple.get(tripleKey(op.date, op.amount)));
    if (byTripleMatch) used.add(keyOf(byTripleMatch));
    else unmatched.push(op);
  }

  // Номера строк выписки и операций могут совпасть — различаем по виду.
  const deletedUsed = new Set<string>();
  const findDeleted = (op: StatementOp) =>
    deleted.find(
      (line) =>
        !deletedUsed.has(keyOf(line)) &&
        ((op.externalId && line.externalId === op.externalId) ||
          tripleKey(line.date, line.amount) === tripleKey(op.date, op.amount)),
    );

  return {
    missingHere: unmatched.map((op) => {
      const match = findDeleted(op);
      if (match) deletedUsed.add(keyOf(match));
      return match ? { op, deleted: match } : { op };
    }),
    missingBank: ours.filter((line) => !used.has(keyOf(line))),
  };
}

/**
 * Расхождение. Остаток банка известен (выписка 1С с конечным остатком) —
 * разница остатков. Не известен (интеграция его не отдаёт, таблица без
 * остатков) — чистая сумма расхождений по операциям: сколько денег одна
 * сторона видит, а другая нет.
 */
export function reconciliationDiff(
  bankBalance: number | null,
  ourBalance: number,
  result: ReconcileResult,
): number {
  if (bankBalance !== null && bankBalance !== undefined) {
    return Math.round((bankBalance - ourBalance) * 100) / 100;
  }
  const here = result.missingHere.reduce((sum, item) => sum + cents(item.op.amount), 0);
  const there = result.missingBank.reduce((sum, line) => sum + cents(line.amount), 0);
  return (here - there) / 100;
}
