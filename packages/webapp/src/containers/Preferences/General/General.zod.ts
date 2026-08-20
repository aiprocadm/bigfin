import intl from 'react-intl-universal';
import { z } from 'zod';

import { isValidInn } from '@/utils/russianLegalAttributes/inn';
import { isValidKpp } from '@/utils/russianLegalAttributes/kpp';
import { isValidOgrn } from '@/utils/russianLegalAttributes/ogrn';
import { isValidOgrnip } from '@/utils/russianLegalAttributes/ogrnip';
import { isValidBik } from '@/utils/russianLegalAttributes/bik';
import {
  isValidBankAccount,
  isValidCorrespondentAccount,
} from '@/utils/russianLegalAttributes/account';
import {
  ORGANIZATION_LEGAL_FORMS,
  TAX_REGIMES,
} from './requisitesOptions';

const required = (label: string) =>
  z.string({ required_error: label }).trim().min(1, label);

/** Необязательное текстовое поле реквизитов: пусто — значит «не заполнено». */
const optionalText = () => z.string().trim().optional().default('');

/**
 * Необязательное поле с проверкой: пустое пропускаем, заполненное — проверяем
 * готовым валидатором. Валидаторы ИНН/КПП/ОГРН/БИК/счетов давно написаны и
 * покрыты тестами, но до этого среза не импортировались НИГДЕ.
 */
const checkedText = (isValid: (value: string) => boolean, messageKey: string) =>
  optionalText().refine((value) => !value || isValid(value), () => ({
    message: intl.get(messageKey),
  }));

/** Значение из списка (или пусто) — чтобы в базу не уехал произвольный код. */
const optionalOneOf = (values: readonly string[]) =>
  optionalText().refine((value) => !value || values.includes(value));

export const generalSchema = z.object({
  name: required(intl.get('organization_name_')),
  tax_number: z.string().optional().default(''),
  industry: z.string().optional().default(''),
  location: z.string().optional().default(''),
  base_currency: required(intl.get('base_currency_')),
  fiscal_year: required(intl.get('fiscal_year_')),
  language: required(intl.get('language')),
  timezone: required(intl.get('time_zone_')),
  date_format: required(intl.get('date_format_')),
  address: z
    .object({
      address1: z.string().optional().default(''),
      address2: z.string().optional().default(''),
      city: z.string().optional().default(''),
      postal_code: z.string().optional().default(''),
      state_province: z.string().optional().default(''),
      phone: z.string().optional().default(''),
    })
    .partial()
    .optional()
    .default({}),

  // --- Реквизиты организации (Р2 срез 1 карты v16) ---
  legal_form: optionalOneOf(ORGANIZATION_LEGAL_FORMS.map((o) => o.value)),
  tax_regime: optionalOneOf(TAX_REGIMES.map((o) => o.value)),

  // ИНН: 10 цифр у юрлица, 12 у ИП и самозанятого. Сначала говорим про
  // длину, и только потом про контрольную сумму — иначе человек с 8 цифрами
  // получит совет «проверьте номер» вместо «цифр не хватает».
  inn: optionalText().superRefine((value, ctx) => {
    if (!value) return;

    if (!/^(\d{10}|\d{12})$/.test(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: intl.get('validation.inn.length'),
      });
    } else if (!isValidInn(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: intl.get('validation.inn.checksum'),
      });
    }
  }),
  kpp: checkedText(isValidKpp, 'validation.kpp.format'),

  // ОГРН (13 цифр) и ОГРНИП (15) лежат в ОДНОЙ колонке, поэтому принимаем
  // оба, а подсказку даём по длине введённого — иначе ИП увидит совет про
  // ОГРН, которого у него нет.
  ogrn: optionalText().superRefine((value, ctx) => {
    if (!value) return;

    const isIp = value.length === 15;
    const valid = isIp ? isValidOgrnip(value) : isValidOgrn(value);

    if (valid) return;

    const lengthOk = isIp ? /^\d{15}$/.test(value) : /^\d{13}$/.test(value);
    const prefix = isIp ? 'validation.ogrnip' : 'validation.ogrn';

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: intl.get(lengthOk ? `${prefix}.checksum` : `${prefix}.length`),
    });
  }),

  bank_name: optionalText(),
  bank_bik: checkedText(isValidBik, 'validation.bik.format'),
  bank_account: checkedText(
    isValidBankAccount,
    'validation.bank_account.length',
  ),
  bank_correspondent_account: checkedText(
    isValidCorrespondentAccount,
    'validation.correspondent_account.format',
  ),
});

export type GeneralFormValues = z.infer<typeof generalSchema>;
