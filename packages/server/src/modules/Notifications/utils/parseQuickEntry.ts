// © 2026 Bigfin
/**
 * Разбор сообщения из Telegram в быструю операцию (㉓).
 *
 * Примеры:
 *   «1500 такси»            → расход 1500, «такси»  (умолчание — расход)
 *   «-1500 такси»           → расход 1500
 *   «+50000 оплата клиента» → приход 50000
 *   «1 500,50 обед»         → расход 1500.50
 */

export type QuickEntry =
  | { kind: 'entry'; amount: number; description: string | null }
  | { kind: 'help' }
  | { kind: 'start' }
  | { kind: 'unknown' };

// Знак, затем число с пробелами-разделителями разрядов и запятой/точкой.
// Минус бывает как ASCII '-', так и типографский '−' (телефонные клавиатуры).
const ENTRY_RE = /^\s*([+\-−])?\s*(\d[\d   ]*(?:[.,]\d+)?)\s*(.*)$/s;

export function parseQuickEntry(text: string): QuickEntry {
  const raw = (text ?? '').trim();
  if (!raw) return { kind: 'unknown' };

  const command = raw.toLowerCase().split(/\s+/)[0];
  if (command === '/help') return { kind: 'help' };
  if (command === '/start') return { kind: 'start' };

  const match = raw.match(ENTRY_RE);
  if (!match) return { kind: 'unknown' };

  const [, sign, rawAmount, rest] = match;
  const magnitude = Number(
    rawAmount.replace(/[   ]/g, '').replace(',', '.'),
  );
  if (!Number.isFinite(magnitude) || magnitude === 0) {
    return { kind: 'unknown' };
  }
  const description = rest.replace(/\s+/g, ' ').trim();

  return {
    kind: 'entry',
    // Приход — только по явному плюсу; всё остальное расход.
    amount: sign === '+' ? magnitude : -magnitude,
    description: description || null,
  };
}
