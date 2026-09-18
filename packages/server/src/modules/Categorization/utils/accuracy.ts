// © 2026 Bigfin
/**
 * Счётчик точности подсказок (этап 12 ТЗ, §12.2).
 *
 * «За месяц: предложено 240, принято 218 (91%)». Без этого числа
 * переключатель «Подсказывать статьи» нечем обосновать: человек не знает,
 * помогает ему продукт или мешает.
 */

export interface FeedbackRecord {
  accepted: boolean;
}

export interface AccuracyStats {
  suggested: number;
  accepted: number;
  /** Доля 0..1; null — предложений не было, считать нечего. */
  rate: number | null;
}

/**
 * Точность за период.
 *
 * **Ноль предложений — это не «точность 0%».** Ноль процентов читается как
 * «подсказки всегда неверны», а на деле их просто не было: нечего принимать
 * и нечего отвергать. Поэтому `null`, а интерфейс показывает прочерк.
 */
export function computeAccuracy(records: FeedbackRecord[]): AccuracyStats {
  const rows = records ?? [];
  const suggested = rows.length;
  const accepted = rows.filter((row) => row.accepted).length;

  return {
    suggested,
    accepted,
    rate: suggested > 0 ? Math.round((accepted / suggested) * 100) / 100 : null,
  };
}

/**
 * Сколько подсказок можно применить массово (§12.2).
 *
 * Кнопка «Применить все подсказки с уверенностью выше 90%» обязана называть
 * количество: «применить 37 подсказок» человек нажимает осознанно, а
 * «применить все» — нет.
 */
export const BULK_APPLY_CONFIDENCE = 0.9;

export function countBulkApplicable(
  suggestions: Array<{ confidence: number } | null>,
): number {
  return (suggestions ?? []).filter(
    (suggestion) =>
      suggestion != null && suggestion.confidence > BULK_APPLY_CONFIDENCE,
  ).length;
}
