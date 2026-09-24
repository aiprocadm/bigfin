// © 2026 Bigfin
import * as moment from 'moment';
import { BusinessContext } from './memo';

/**
 * Контекст бизнеса (FT-101 ТЗ-3): отрасль, стадия, размер, модель продаж.
 *
 * Значения по умолчанию ВЫВОДЯТСЯ ИЗ ДАННЫХ, а не спрашиваются вслепую:
 * стадия — по дате первой операции, размер — по выручке за год и числу
 * сотрудников, модель продаж — по тому, как продаёт организация. Человек
 * может поправить любое, и его выбор важнее вывода.
 */
export interface ContextSignals {
  industry: string | null;
  firstOperationDate: string | null;
  yearRevenue: number;
  employees: number;
  invoices: number;
  receipts: number;
}

export function inferContext(signals: ContextSignals, today = moment()): BusinessContext {
  let stage: BusinessContext['stage'] = null;
  if (signals.firstOperationDate) {
    const months = today.diff(moment(signals.firstOperationDate), 'months');
    stage = months < 12 ? 'start' : months < 36 ? 'growth' : 'mature';
  }
  // Пороги — по закону о МСП (209-ФЗ): микро до 120 млн выручки и 15 человек,
  // малое до 800 млн и 100 человек.
  const size: BusinessContext['size'] =
    signals.yearRevenue <= 120_000_000 && signals.employees <= 15
      ? 'micro'
      : signals.yearRevenue <= 800_000_000 && signals.employees <= 100
        ? 'small'
        : 'medium';
  const salesModel: BusinessContext['salesModel'] =
    signals.invoices === 0 && signals.receipts === 0
      ? null
      : signals.receipts === 0
        ? 'b2b'
        : signals.invoices === 0
          ? 'b2c'
          : 'mixed';
  return { industry: signals.industry || null, stage, size, salesModel, note: null };
}

/** Сохранённое человеком поверх выведенного из данных. */
export function mergeContext(inferred: BusinessContext, saved: Partial<BusinessContext> | null): BusinessContext {
  const pick = <K extends keyof BusinessContext>(key: K) =>
    saved && saved[key] !== undefined && saved[key] !== null && saved[key] !== '' ? (saved[key] as BusinessContext[K]) : inferred[key];
  return { industry: pick('industry'), stage: pick('stage'), size: pick('size'), salesModel: pick('salesModel'), note: pick('note') };
}

export const STAGES = ['start', 'growth', 'mature'] as const;
export const SIZES = ['micro', 'small', 'medium'] as const;
export const SALES_MODELS = ['b2b', 'b2c', 'mixed'] as const;
