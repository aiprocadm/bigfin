import { z } from 'zod';
import intl from 'react-intl-universal';

/**
 * Схема формы валюты (создание/редактирование).
 * Собирается фабрикой, чтобы intl-строки читались после загрузки локали.
 */
export const buildCurrencyFormSchema = () =>
  z.object({
    currency_code: z
      .string()
      .min(1, intl.get('currency_form.validation.code_required'))
      .max(4, intl.get('currency_form.validation.code_max_length')),
    currency_name: z
      .string()
      .min(1, intl.get('currency_form.validation.name_required')),
    currency_sign: z
      .string()
      .min(1, intl.get('currency_form.validation.sign_required')),
  });

export type CurrencyFormValues = z.infer<
  ReturnType<typeof buildCurrencyFormSchema>
>;
