// © 2026 Bigfin

/**
 * Налоговый режим денежного счёта (FT-070 ТЗ-3, D15).
 *
 * ПОЧЕМУ СВОЙ ПЕРЕЧЕНЬ, А НЕ `TaxRegime` ОРГАНИЗАЦИИ. У организации режим
 * один и описывает её реквизиты. У счёта вопрос другой: «по какому режиму
 * облагаются деньги, пришедшие именно сюда». Отсюда режимы, которых у
 * реквизитов нет: упрощёнка с НДС 5 / 7 / 20 % (обязательна с 2025 года при
 * выручке выше порога) и налог на профессиональный доход — самозанятость
 * часто живёт на отдельной карте рядом с ИП.
 *
 * Значение `null` — «как у организации»: так счёт ведёт себя ровно как до
 * появления поля.
 */
export const ACCOUNT_TAX_REGIMES = [
  'USN_INCOME',
  'USN_INCOME_EXPENSE',
  'USN_VAT_5',
  'USN_VAT_7',
  'USN_VAT_20',
  'OSNO',
  'AUSN',
  'PSN',
  'NPD',
] as const;

export type AccountTaxRegime = (typeof ACCOUNT_TAX_REGIMES)[number];

/**
 * Типы счетов, у которых режим имеет смысл: деньги. Режим у счёта выручки
 * или у долга поставщику ничего бы не значил — оценка налога идёт по тому,
 * КУДА пришли деньги.
 */
export const TAX_REGIME_ACCOUNT_TYPES: readonly string[] = ['cash', 'bank'];

export const isAccountTaxRegime = (value: unknown): value is AccountTaxRegime =>
  typeof value === 'string' &&
  (ACCOUNT_TAX_REGIMES as readonly string[]).includes(value);

/**
 * Приводит присланный режим к виду для записи.
 *
 * - `undefined` — поле не прислали: не трогаем (старые формы и интеграции
 *   не знают о поле, и правка счёта не должна молча стирать режим);
 * - пустая строка и `null` — «как у организации», пишем `null`;
 * - у не денежного счёта режима не бывает — тоже `null`.
 */
export function normalizeAccountTaxRegime(
  value: unknown,
  accountType: string | null | undefined,
): AccountTaxRegime | null | undefined {
  if (value === undefined) return undefined;
  if (!TAX_REGIME_ACCOUNT_TYPES.includes(String(accountType ?? ''))) {
    return null;
  }
  return isAccountTaxRegime(value) ? value : null;
}
