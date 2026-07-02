import intl from 'react-intl-universal';
import { z } from 'zod';

import { DATATYPES_LENGTH } from '@/constants/dataTypes';

/** Числовая строка: допускаем и точку, и запятую как разделитель. */
const isNumeric = (value: string) =>
  !Number.isNaN(Number(value.replace(',', '.')));

/** Число из строки формы (запятая → точка). */
export const parseFormNumber = (value: string) =>
  Number(value.replace(',', '.'));

/**
 * Схема операции «Деньги ушли». Повторяет легаси-Yup
 * (MoneyOutForm.schema): обязательные дата, сумма, тип операции,
 * текущий счёт и счёт-назначение; описание — от 3 символов, если заполнено.
 * Сообщение = подпись поля (паттерн MoneyIn.zod / ItemCategory.zod).
 */
export const getMoneyOutSchema = () =>
  z.object({
    date: z
      .string({ required_error: intl.get('date') })
      .min(1, intl.get('date')),
    amount: z
      .string({ required_error: intl.get('amount') })
      .min(1, intl.get('amount'))
      .refine(isNumeric, intl.get('amount')),
    transaction_type: z.string().min(1, intl.get('transaction_type')),
    cashflow_account_id: z
      .number()
      .nullable()
      .refine(
        (value) => value !== null,
        intl.get('cash_flow_transaction.label_current_account'),
      ),
    credit_account_id: z
      .number()
      .nullable()
      .refine((value) => value !== null, intl.get('select_account')),
    transaction_number: z.string().optional().default(''),
    reference_no: z.string().optional().default(''),
    branch_id: z.number().nullable(),
    exchange_rate: z
      .string()
      .refine(
        (value) => value === '' || isNumeric(value),
        intl.get('exchange_rate'),
      ),
    description: z
      .string()
      .max(DATATYPES_LENGTH.TEXT, intl.get('description'))
      .refine(
        (value) => value === '' || value.length >= 3,
        intl.get('description'),
      ),
  });

export type MoneyOutFormValues = z.infer<ReturnType<typeof getMoneyOutSchema>>;
