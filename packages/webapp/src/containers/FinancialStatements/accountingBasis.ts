// © 2026 Bigfin
/**
 * Метод учёта в ОПиУ: кассовый или по начислению (п. 4.3 ТЗ).
 *
 * Одна и та же прибыль считается двумя способами, и цифры расходятся законно.
 * Поэтому правило выбора метода живёт в одном месте и повторяет серверное:
 * `ProfitLossSheet/utils.ts` → `getDefaultPLQuery`. Разойдутся — витрина
 * напишет «Кассовый», а сервер посчитает по начислению, и человек будет
 * смотреть на подпись, которая врёт про его же деньги.
 */

export type AccountingBasis = 'cash' | 'accrual';

/** Оба метода в порядке показа: сначала кассовый — он ближе аудитории. */
export const ACCOUNTING_BASIS_OPTIONS: ReadonlyArray<{
  value: AccountingBasis;
  /** Ключ подписи кнопки — уже есть в словарях. */
  labelKey: string;
  /** Ключ пояснения в одну строку: чем этот метод отличается. */
  hintKey: string;
}> = [
  {
    value: 'cash',
    labelKey: 'cash',
    hintKey: 'reports.basis.cash_hint',
  },
  {
    value: 'accrual',
    labelKey: 'accrual',
    hintKey: 'reports.basis.accrual_hint',
  },
];

/**
 * Какой метод показан на самом деле.
 *
 * Повторяет сервер: явный метод из адреса важнее умолчания, а умолчание
 * зависит от флага `accrual_pnl` — с ним кассовый (аудитория думает движением
 * денег), без него легаси-поведение «по начислению».
 */
export function resolveAccountingBasis(
  rawBasis: unknown,
  accrualFeatureEnabled: boolean,
): AccountingBasis {
  if (rawBasis === 'cash' || rawBasis === 'accrual') {
    return rawBasis;
  }
  return accrualFeatureEnabled ? 'cash' : 'accrual';
}

/** Пояснение к выбранному методу — человеческой строкой, без терминов. */
export function accountingBasisHintKey(basis: AccountingBasis): string {
  const option = ACCOUNTING_BASIS_OPTIONS.find(
    (item) => item.value === basis,
  );
  return option ? option.hintKey : ACCOUNTING_BASIS_OPTIONS[0].hintKey;
}
