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

/**
 * Разводит совпадающие ключи В ПРЕДЕЛАХ ОДНОГО ФАЙЛА (И1 срез 2 карты v12).
 *
 * Две реально разные операции с одинаковыми номером, датой и суммой (частая
 * ситуация в РФ: две одинаковые комиссии за день) дают один и тот же базовый
 * ключ и без разведения схлопнулись бы в дубль. Первое вхождение оставляем
 * без суффикса — это сохраняет совместимость с уже импортированными данными и
 * идемпотентность повторного импорта (порядок строк в файле стабилен);
 * последующие получают суффикс `#2`, `#3`, …
 *
 * @returns функция-нумератор с внутренним счётчиком; создавайте по одной на файл.
 */
export function makeExternalIdDeduper(): (base: string) => string {
  const seen = new Map<string, number>();
  return (base: string): string => {
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  };
}
