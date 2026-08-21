import * as Yup from 'yup';
import intl from 'react-intl-universal';

import { isValidInn } from '@/utils/russianLegalAttributes/inn';
import { isValidKpp } from '@/utils/russianLegalAttributes/kpp';
import { isValidOgrn } from '@/utils/russianLegalAttributes/ogrn';
import { isValidOgrnip } from '@/utils/russianLegalAttributes/ogrnip';
import { isValidBik } from '@/utils/russianLegalAttributes/bik';
import {
  isValidBankAccount,
  isValidCorrespondentAccount,
} from '@/utils/russianLegalAttributes/account';
import { CONTACT_LEGAL_FORMS } from './contactRequisitesOptions';

/**
 * Реквизиты контрагента (Р2 срез 3 карты v16) — общий кусок Yup-схемы для
 * форм клиента и поставщика. Клиентские валидаторы давно написаны и покрыты
 * тестами, но до этого среза не импортировались НИГДЕ.
 *
 * Пустое значение — «не заполнено», проверяется только заполненное.
 */
const optionalChecked = (
  isValid: (value: string) => boolean,
  messageKey: string,
) =>
  Yup.string()
    .trim()
    .test('requisite', () => intl.get(messageKey), (value) => !value || isValid(value));

export const contactRequisitesSchemaFields = () => ({
  legal_form: Yup.string()
    .trim()
    .oneOf(['', ...CONTACT_LEGAL_FORMS.map((o) => o.value)]),
  inn: optionalChecked(isValidInn, 'validation.inn.checksum'),
  kpp: optionalChecked(isValidKpp, 'validation.kpp.format'),
  // ОГРН (13 цифр) и ОГРНИП (15) лежат в одной колонке — принимаем оба.
  ogrn: optionalChecked(
    (value) => (value.length === 15 ? isValidOgrnip(value) : isValidOgrn(value)),
    'validation.ogrn.checksum',
  ),
  bank_name: Yup.string().trim(),
  bank_bik: optionalChecked(isValidBik, 'validation.bik.format'),
  bank_account: optionalChecked(
    isValidBankAccount,
    'validation.bank_account.length',
  ),
  bank_correspondent_account: optionalChecked(
    isValidCorrespondentAccount,
    'validation.correspondent_account.format',
  ),
});

/** Начальные значения тех же полей — для defaultInitialValues обеих форм. */
export const contactRequisitesInitialValues = {
  legal_form: '',
  inn: '',
  kpp: '',
  ogrn: '',
  bank_name: '',
  bank_bik: '',
  bank_account: '',
  bank_correspondent_account: '',
};
