import intl from 'react-intl-universal';

import { LegalForm } from '@/utils/russianLegalAttributes/constants';

/**
 * Юр. формы КОНТРАГЕНТА (Р2 срез 3 карты v16). В отличие от организации,
 * здесь законно «Физлицо» (`INDIVIDUAL`) — продажа физлицу без статуса ИП.
 */
export const CONTACT_LEGAL_FORMS = [
  { value: LegalForm.OOO, labelKey: 'requisites.legal_form.ooo' },
  { value: LegalForm.IP, labelKey: 'requisites.legal_form.ip' },
  { value: LegalForm.NPD, labelKey: 'requisites.legal_form.npd' },
  { value: LegalForm.AO, labelKey: 'requisites.legal_form.ao' },
  { value: LegalForm.INDIVIDUAL, labelKey: 'requisites.legal_form.individual' },
] as const;

/** Подписи считаем при отрисовке: словарь к моменту импорта ещё не загружен. */
export const contactLegalFormOptions = () => [
  { value: '', label: intl.get('requisites.legal_form.select') },
  ...CONTACT_LEGAL_FORMS.map((option) => ({
    value: option.value,
    label: intl.get(option.labelKey),
  })),
];
