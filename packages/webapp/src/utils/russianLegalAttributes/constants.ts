/**
 * Зеркало `packages/server/src/modules/RussianLegalAttributes/constants.ts`.
 * При изменении одного — обновить второй вручную.
 * Если появится третий потребитель этих констант (например, server-shared
 * библиотека) — вынести в общий пакет.
 */

/**
 * Российские юр.формы организаций и контрагентов.
 * Используется в Organization.legal_form и Contact.legal_form.
 *
 * INDIVIDUAL — физлицо как контрагент (продажа физлицу).
 * Не применяется к Organization.
 */
export enum LegalForm {
  OOO = 'OOO', // Общество с ограниченной ответственностью
  IP = 'IP', // Индивидуальный предприниматель
  NPD = 'NPD', // Самозанятый (плательщик НПД)
  AO = 'AO', // Акционерное общество
  INDIVIDUAL = 'INDIVIDUAL', // Физлицо (только для contacts)
}

/**
 * Налоговый режим организации в РФ.
 * Используется в Organization.tax_regime.
 * Определяет дефолтную ставку НДС при создании Invoice/Bill (см. Task 10).
 */
export enum TaxRegime {
  USN_INCOME = 'USN_INCOME', // УСН Доходы 6%
  USN_INCOME_EXPENSE = 'USN_INCOME_EXPENSE', // УСН Доходы-Расходы 15%
  OSNO = 'OSNO', // Общая система налогообложения
  PATENT = 'PATENT', // Патентная система (только для ИП)
  AUSN = 'AUSN', // Автоматизированная УСН
}

/**
 * Набор tax-rate code'ов, добавленных миграцией #1.
 * Используется для автоподстановки дефолтной ставки.
 */
export const VAT_CODES = {
  VAT_20: 'VAT_20',
  VAT_10: 'VAT_10',
  VAT_0: 'VAT_0',
  VAT_NONE: 'VAT_NONE',
} as const;

/**
 * Маппинг налогового режима → дефолтный VAT code при создании Invoice/Bill.
 */
export const DEFAULT_VAT_BY_REGIME: Record<TaxRegime, string> = {
  [TaxRegime.USN_INCOME]: VAT_CODES.VAT_NONE,
  [TaxRegime.USN_INCOME_EXPENSE]: VAT_CODES.VAT_NONE,
  [TaxRegime.OSNO]: VAT_CODES.VAT_20,
  [TaxRegime.PATENT]: VAT_CODES.VAT_NONE,
  [TaxRegime.AUSN]: VAT_CODES.VAT_NONE,
};
