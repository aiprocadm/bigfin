/**
 * Честный итог импорта выписки (И1 карты v12).
 *
 * `skipped` — общее число непринятых записей, чтобы старые потребители не
 * сломались, но теперь оно разложено на понятные причины:
 *   duplicates  — запись уже была (дедуп по external_id);
 *   noDirection — не удалось определить приход/расход (формат 1С);
 *   unparsed    — строку не распознал разборщик (табличный формат).
 *
 * Инвариант: skipped = duplicates + noDirection + unparsed,
 * а imported + skipped = всего записей в файле.
 */
export interface Import1CResult {
  imported: number;
  skipped: number;
  duplicates: number;
  noDirection: number;
  unparsed: number;
}
