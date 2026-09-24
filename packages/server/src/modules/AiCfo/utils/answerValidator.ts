// © 2026 Bigfin
import { collectKnownNumbers } from '@/modules/AiAnalyst/utils/insightValidation';

/**
 * Проверка пояснения модели (FT-102 ТЗ-3, железное правило 2).
 *
 * Модель только пересказывает готовые числа. Любое число в её тексте, которого
 * нет в расчётах, — выдумка: оно ЗАМЕНЯЕТСЯ на «см. отчёт», а не выбрасывается
 * вместе со всем ответом (так было в чате этапа 14 — человек терял и верные
 * объяснения), и о нём пишется инцидент.
 *
 * Правила сравнения — те же, что у ленты выводов: мелкие целые (до 12 —
 * «3 причины», «5 статей») не проверяются, совпадение — с допуском 1 %,
 * доли сравниваются и в процентах.
 */
export const REPLACEMENT = 'см. отчёт';
const TRIVIAL_LIMIT = 12;
const TOLERANCE = 0.01;

/**
 * Даты — не суммы: «2026-08-01» или «01.08.2026» иначе читались бы как 2026 и
 * «−31», и сверщик отбраковывал бы верный ответ, где названа дата разрыва.
 * Дату пропускаем целиком — её проверяет не сумма, а ссылка на отчёт.
 */
const DATE = /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g;

/** Число в тексте: «1 234 567,89», «−12,5», «15%». Разделители тысяч — пробел или неразрывный. */
const NUMBER = /-?[−–—]?\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?|[-−–—]?\d+(?:[.,]\d+)?/g;

const toNumber = (raw: string): number =>
  Number(raw.replace(/[−–—]/g, '-').replace(/[   ]/g, '').replace(',', '.'));

const isTrivial = (value: number) => Number.isInteger(value) && Math.abs(value) <= TRIVIAL_LIMIT;

export function matchesKnown(value: number, known: number[]): boolean {
  return known.some((k) => {
    if (k === value) return true;
    const scale = Math.max(Math.abs(k), Math.abs(value));
    return scale > 0 && Math.abs(Math.abs(k) - Math.abs(value)) / scale <= TOLERANCE;
  });
}

export interface ValidatedText {
  text: string;
  /** Числа, которых нет в расчётах, — по каждому пишется инцидент. */
  rejected: number[];
}

export function validateExplanation(text: string, evidence: unknown): ValidatedText {
  const known = collectKnownNumbers(evidence);
  const rejected: number[] = [];
  const dates: string[] = [];
  // Номер даты в метке — буквами: цифры метки сверщик принял бы за число.
  const tag = (i: number) => String(i).replace(/\d/g, (d) => 'abcdefghij'[Number(d)]);
  const untag = (t: string) => Number(t.replace(/[a-j]/g, (c) => String('abcdefghij'.indexOf(c))));
  const masked = String(text ?? '').replace(DATE, (date) => `\u0000${tag(dates.push(date) - 1)}\u0000`);
  const cleaned = masked
    .replace(NUMBER, (raw) => {
      const value = toNumber(raw);
      if (!Number.isFinite(value) || isTrivial(value) || matchesKnown(value, known)) return raw;
      rejected.push(value);
      return REPLACEMENT;
    })
    .replace(/\u0000([a-j]+)\u0000/g, (_m, t) => dates[untag(t)]);
  return { text: cleaned, rejected };
}
