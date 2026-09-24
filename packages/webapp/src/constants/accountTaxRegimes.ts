// © 2026 Bigfin
import intl from 'react-intl-universal';

/**
 * Налоговый режим денежного счёта (FT-070 ТЗ-3).
 *
 * Перечень повторяет серверный домен `ACCOUNT_TAX_REGIMES`. Пустое значение —
 * «как у организации»: так счёт ведёт себя, пока режим не выбран, и так
 * оценка налога работает у всех, кто поле не трогал.
 *
 * Подписи общих с организацией режимов берутся из тех же ключей, что в
 * реквизитах: один режим — одно название по всему продукту.
 */
export const ACCOUNT_TAX_REGIME_OPTIONS: ReadonlyArray<{
  value: string;
  labelKey: string;
}> = [
  { value: 'USN_INCOME', labelKey: 'requisites.tax_regime.usn_income' },
  {
    value: 'USN_INCOME_EXPENSE',
    labelKey: 'requisites.tax_regime.usn_income_expense',
  },
  { value: 'USN_VAT_5', labelKey: 'accounts.tax_regime.usn_vat_5' },
  { value: 'USN_VAT_7', labelKey: 'accounts.tax_regime.usn_vat_7' },
  { value: 'USN_VAT_20', labelKey: 'accounts.tax_regime.usn_vat_20' },
  { value: 'OSNO', labelKey: 'requisites.tax_regime.osno' },
  { value: 'AUSN', labelKey: 'requisites.tax_regime.ausn' },
  { value: 'PSN', labelKey: 'requisites.tax_regime.patent' },
  { value: 'NPD', labelKey: 'accounts.tax_regime.npd' },
];

/** Типы счетов, у которых режим выбирается: касса и банк. */
export const TAX_REGIME_ACCOUNT_TYPES: readonly string[] = ['cash', 'bank'];

export const accountSupportsTaxRegime = (accountType?: string | null) =>
  TAX_REGIME_ACCOUNT_TYPES.includes(String(accountType ?? ''));

/**
 * Пункты списка для формы: первым — «как у организации». Подписи считаем при
 * отрисовке: словарь к моменту импорта модуля ещё не загружен.
 */
export const getAccountTaxRegimeItems = () => [
  { value: '', label: intl.get('accounts.tax_regime.as_organization') },
  ...ACCOUNT_TAX_REGIME_OPTIONS.map((option) => ({
    value: option.value,
    label: intl.get(option.labelKey),
  })),
];

/** Подпись режима; пусто или неизвестное значение — пустая строка. */
export const accountTaxRegimeLabel = (value?: string | null): string => {
  const option = ACCOUNT_TAX_REGIME_OPTIONS.find((item) => item.value === value);
  return option ? intl.get(option.labelKey) : '';
};

/**
 * Значение поля формы → значение для сервера. У не денежного счёта режима
 * не бывает, и поле не отправляется вовсе: форма общая для всех счетов, и
 * правка счёта выручки не должна ничего писать в чужое ей поле.
 */
export const taxRegimeForRequest = (
  accountType: string | null | undefined,
  value: string | null | undefined,
): string | null | undefined => {
  if (!accountSupportsTaxRegime(accountType)) return undefined;
  return value ? value : null;
};
