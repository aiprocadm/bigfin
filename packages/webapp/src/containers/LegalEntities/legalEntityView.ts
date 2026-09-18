// © 2026 Bigfin
/**
 * Правила показа справочника юрлиц (этап 6 ТЗ, §6.4).
 *
 * Главное правило этапа со стороны интерфейса: **пока юрлицо одно, раздел не
 * навязывается**. Колонки «Юрлицо» и фильтры по нему не показываются нигде —
 * человеку, у которого одна фирма, они только мешают. Появляются, когда
 * появляется второе юрлицо.
 */

export interface LegalEntityRow {
  id: number;
  name: string;
  form: string;
  inn: string | null;
  taxSystem: string | null;
  ownershipShare: number;
  isPrimary: boolean;
  active: boolean;
  accountsCount: number;
}

/**
 * Показывать ли разрез по юрлицу в остальных разделах.
 *
 * Считаем ДЕЙСТВУЮЩИЕ юрлица: выключенное остаётся в базе ради прошлых
 * операций, но разрез из-за него навязывать не за что.
 */
export function shouldShowLegalEntityBreakdown(
  entities: LegalEntityRow[] | undefined,
): boolean {
  const active = (entities ?? []).filter((entity) => entity.active);
  return active.length > 1;
}

/**
 * Можно ли удалить юрлицо прямо из списка.
 *
 * Кнопку прячем там, где сервер всё равно откажет: у юрлица с закреплёнными
 * счетами и у единственного. Показать кнопку, которая всегда отвечает
 * отказом, — это обещание, которого интерфейс не держит.
 *
 * Полной проверки здесь нет и быть не может: операции висят не только на
 * счетах. Последнее слово за сервером, здесь — только очевидные случаи.
 */
export function canDeleteLegalEntity(
  entity: LegalEntityRow,
  entities: LegalEntityRow[] | undefined,
): boolean {
  if ((entities ?? []).length <= 1) return false;
  return entity.accountsCount === 0;
}

/**
 * Доля владельца строкой.
 *
 * Целую долю показываем без хвоста: «100%», а не «100.00%». Хвост из нулей
 * создаёт впечатление точности, которой в доле владения обычно нет, и мешает
 * глазу в таблице, где почти у всех стоит ровно сто.
 */
export function formatOwnershipShare(share: number): string {
  const rounded = Math.round(Number(share ?? 0) * 100) / 100;
  return `${rounded}%`;
}
