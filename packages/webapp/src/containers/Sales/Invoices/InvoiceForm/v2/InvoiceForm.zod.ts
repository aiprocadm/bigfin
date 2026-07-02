import moment from 'moment';
import intl from 'react-intl-universal';
import { z } from 'zod';
import { DATATYPES_LENGTH } from '@/constants/dataTypes';

/**
 * Значения строки-позиции счёта в форме (v2, RHF).
 * Инпуты дают строки; в режиме редактирования сервер может дать числа —
 * тип терпим к обоим, нормализация происходит в utils.
 */
export interface InvoiceEntryFormValues {
  index?: number;
  item_id: string | number;
  quantity: string | number;
  rate: string | number;
  discount?: string | number;
  description?: string;
  tax_rate_id?: string | number;
  tax_rate?: string | number;
  tax_amount?: string | number;
  amount?: string | number;
}

/** Значения формы счёта (v2). Имена полей — как в легаси (snake_case). */
export interface InvoiceFormValues {
  customer_id: string | number;
  invoice_date: string;
  due_date: string;
  delivered?: string | boolean;
  invoice_no?: string;
  invoice_no_manually?: string;
  inclusive_exclusive_tax: string;
  reference_no?: string;
  invoice_message?: string;
  terms_conditions?: string;
  exchange_rate?: string | number;
  currency_code?: string;
  branch_id?: string | number;
  warehouse_id?: string | number;
  project_id?: string | number;
  pdf_template_id?: string | number;
  entries: InvoiceEntryFormValues[];
  attachments?: unknown[];
  payment_methods?: Record<string, { enable: boolean }>;
  discount?: string | number;
  discount_type?: string;
  adjustment?: string | number;
}

/**
 * Zod-схема формы счёта (замена Yup-схемы легаси).
 * Валидирует шапку; строки-позиции проверяются бизнес-правилом
 * «суммарное количество ≠ 0» в обработчике сохранения (как в легаси).
 * Используется с zodResolver(..., { raw: true }) — значения формы
 * не обрезаются до перечисленных ключей.
 */
export const getInvoiceFormSchema = () =>
  z
    .object({
      customer_id: z
        .union([z.string(), z.number()])
        .refine((value) => String(value ?? '').trim() !== '', {
          message: intl.get('required'),
        }),
      invoice_date: z.string().min(1, intl.get('required')),
      due_date: z.string().min(1, intl.get('required')),
      invoice_no: z.string().max(DATATYPES_LENGTH.STRING).optional(),
      reference_no: z.string().max(DATATYPES_LENGTH.STRING).optional(),
      invoice_message: z.string().max(DATATYPES_LENGTH.TEXT).optional(),
      terms_conditions: z.string().max(DATATYPES_LENGTH.TEXT).optional(),
      entries: z.array(z.any()),
    })
    .superRefine((values, ctx) => {
      // Срок оплаты не может быть раньше даты счёта (легаси: Yup .min(ref)).
      if (
        values.invoice_date &&
        values.due_date &&
        values.due_date < values.invoice_date
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['due_date'],
          message: intl.get('invoice.validation.due_date', {
            path: intl.get('due_date_'),
            min: moment(values.invoice_date).format('YYYY/MM/DD'),
          }),
        });
      }
    });
