import intl from 'react-intl-universal';

import {
  LegalForm,
  TaxRegime,
} from '@/utils/russianLegalAttributes/constants';

export interface RequisiteOption {
  value: string;
  labelKey: string;
}

/**
 * Организационно-правовые формы, доступные ОРГАНИЗАЦИИ.
 *
 * `INDIVIDUAL` (физлицо) в список не входит намеренно: это форма контрагента
 * при продаже физлицу, у самой организации её быть не может. Сервер её
 * принимает (`@IsEnum(LegalForm)`), поэтому отсекаем на входе в форму.
 */
export const ORGANIZATION_LEGAL_FORMS: readonly RequisiteOption[] = [
  { value: LegalForm.OOO, labelKey: 'requisites.legal_form.ooo' },
  { value: LegalForm.IP, labelKey: 'requisites.legal_form.ip' },
  { value: LegalForm.NPD, labelKey: 'requisites.legal_form.npd' },
  { value: LegalForm.AO, labelKey: 'requisites.legal_form.ao' },
] as const;

/** Налоговые режимы РФ. */
export const TAX_REGIMES: readonly RequisiteOption[] = [
  { value: TaxRegime.USN_INCOME, labelKey: 'requisites.tax_regime.usn_income' },
  {
    value: TaxRegime.USN_INCOME_EXPENSE,
    labelKey: 'requisites.tax_regime.usn_income_expense',
  },
  { value: TaxRegime.OSNO, labelKey: 'requisites.tax_regime.osno' },
  { value: TaxRegime.PATENT, labelKey: 'requisites.tax_regime.patent' },
  { value: TaxRegime.AUSN, labelKey: 'requisites.tax_regime.ausn' },
] as const;

/** Подписи считаем при отрисовке: словарь к моменту импорта ещё не загружен. */
export const withLabels = (options: readonly RequisiteOption[]) =>
  options.map((option) => ({
    value: option.value,
    label: intl.get(option.labelKey),
  }));

/**
 * Режимы, где своя ставка налога имеет смысл (Н3б карты v22): упрощёнка и
 * автоматизированная упрощёнка. На общей системе и патенте оценка налога не
 * считается вовсе, поэтому и поле ставки там не показывается.
 */
export const TAX_RATE_REGIMES: readonly string[] = [
  TaxRegime.USN_INCOME,
  TaxRegime.USN_INCOME_EXPENSE,
  TaxRegime.AUSN,
];
