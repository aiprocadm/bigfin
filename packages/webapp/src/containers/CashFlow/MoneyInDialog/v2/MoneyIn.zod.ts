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
 * Схема операции «Деньги пришли». Повторяет легаси-Yup
 * (MoneyInForm.schema): обязательные дата, сумма, тип операции,
 * текущий счёт и счёт-источник; описание — от 3 символов, если заполнено.
 * Сообщение = подпись поля (паттерн ItemCategory.zod).
 */
/**
 * Обязательность «не null» проверяем через `superRefine`, а не `refine`:
 * `refine` в новых версиях сужает выводимый тип до `number`, и тогда
 * `defaultValues: { credit_account_id: null }` перестаёт подходить под тип
 * формы. Под компилятором 4.9 это не проявлялось, под 5.6 — 28 ошибок в
 * обеих формах денег (К3 карты v19). Поведение проверки не меняется:
 * сообщение и условие те же.
 */
export const getMoneyInSchema = () =>
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
      .superRefine((value, ctx) => {
        if (value === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: intl.get('cash_flow_transaction.label_current_account'),
          });
        }
      }),
    credit_account_id: z
      .number()
      .nullable()
      .superRefine((value, ctx) => {
        if (value === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: intl.get('select_account'),
          });
        }
      }),
    transaction_number: z.string().optional().default(''),
    reference_no: z.string().optional().default(''),
    branch_id: z.number().nullable(),

    // Отметка «внутригрупповая операция» (остаток К2).
    // Выключена по умолчанию: подавляющее большинство операций
    // обычные, а включённая отметка вычитает выручку из отчёта.
    is_intercompany: z.boolean().optional().default(false),
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

export type MoneyInFormValues = z.infer<ReturnType<typeof getMoneyInSchema>>;
