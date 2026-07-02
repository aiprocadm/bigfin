import moment from 'moment';
import intl from 'react-intl-universal';
import { z } from 'zod';
import { DATATYPES_LENGTH } from '@/constants/dataTypes';

/**
 * Значения строки-позиции сметы в форме (v2, RHF).
 * Инпуты дают строки; в режиме редактирования сервер может дать числа —
 * тип терпим к обоим, нормализация происходит в utils.
 */
export interface EstimateEntryFormValues {
  index?: number;
  item_id: string | number;
  quantity: string | number;
  rate: string | number;
  discount?: string | number;
  description?: string;
  amount?: string | number;
}

/** Значения формы сметы (v2). Имена полей — как в легаси (snake_case). */
export interface EstimateFormValues {
  customer_id: string | number;
  estimate_date: string;
  expiration_date: string;
  delivered?: string | boolean;
  estimate_number?: string;
  estimate_number_manually?: string;
  reference?: string;
  note?: string;
  terms_conditions?: string;
  exchange_rate?: string | number;
  currency_code?: string;
  branch_id?: string | number;
  warehouse_id?: string | number;
  project_id?: string | number;
  pdf_template_id?: string | number;
  entries: EstimateEntryFormValues[];
  attachments?: unknown[];
  discount?: string | number;
  discount_type?: string;
  adjustment?: string | number;
}

/**
 * Zod-схема формы сметы (замена Yup-схемы легаси).
 * Валидирует шапку; строки-позиции проверяются бизнес-правилом
 * «суммарное количество ≠ 0» в обработчике сохранения (как в легаси).
 * Используется с zodResolver(..., { raw: true }) — значения формы
 * не обрезаются до перечисленных ключей.
 */
export const getEstimateFormSchema = () =>
  z
    .object({
      customer_id: z
        .union([z.string(), z.number()])
        .refine((value) => String(value ?? '').trim() !== '', {
          message: intl.get('required'),
        }),
      estimate_date: z.string().min(1, intl.get('required')),
      expiration_date: z.string().min(1, intl.get('required')),
      estimate_number: z.string().max(DATATYPES_LENGTH.STRING).optional(),
      reference: z.string().max(DATATYPES_LENGTH.STRING).optional(),
      note: z.string().max(DATATYPES_LENGTH.STRING).optional(),
      terms_conditions: z.string().max(DATATYPES_LENGTH.TEXT).optional(),
      entries: z.array(z.any()),
    })
    .superRefine((values, ctx) => {
      // Срок действия не может быть раньше даты сметы (легаси: Yup .min(ref)).
      if (
        values.estimate_date &&
        values.expiration_date &&
        values.expiration_date < values.estimate_date
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiration_date'],
          message: intl.get('estimate.validation.expiration_date', {
            path: intl.get('expiration_date_'),
            min: moment(values.estimate_date).format('YYYY/MM/DD'),
          }),
        });
      }
    });
