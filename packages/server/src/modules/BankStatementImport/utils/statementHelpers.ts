import { Parsed1CDocument } from './parse1CStatement';

export type StatementDirection = 'in' | 'out' | 'unknown';

export interface ResolvedLine {
  direction: StatementDirection;
  counterpartyName: string;
  counterpartyInn: string;
}

/**
 * Направление относительно нашего счёта (из заголовка файла):
 * наш счёт получатель → приход, контрагент = плательщик;
 * наш счёт плательщик → расход, контрагент = получатель.
 */
export function resolveDirection(
  doc: Parsed1CDocument,
  ourAccountNumber: string,
): ResolvedLine {
  if (doc.payeeAccountNumber && doc.payeeAccountNumber === ourAccountNumber) {
    return { direction: 'in', counterpartyName: doc.payerName, counterpartyInn: doc.payerInn };
  }
  if (doc.payerAccountNumber && doc.payerAccountNumber === ourAccountNumber) {
    return { direction: 'out', counterpartyName: doc.payeeName, counterpartyInn: doc.payeeInn };
  }
  return { direction: 'unknown', counterpartyName: '', counterpartyInn: '' };
}

/** Устойчивый ключ дедупликации в рамках одного счёта. */
export function buildExternalId(doc: Parsed1CDocument): string {
  return `1c:${doc.docNumber}:${doc.date}:${doc.amount.toFixed(2)}`;
}
