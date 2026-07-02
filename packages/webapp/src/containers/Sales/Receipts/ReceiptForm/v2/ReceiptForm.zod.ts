import intl from 'react-intl-universal';
import { z } from 'zod';
import { DATATYPES_LENGTH } from '@/constants/dataTypes';

/**
 * Значения строки-позиции чека в форме (v2, RHF).
 * Инпуты дают строки; в режиме редактирования сервер может дать числа —
 * тип терпим к обоим, нормализация происходит в utils.
 */
export interface ReceiptEntryFormValues {
  index?: number;
  item_id: string | number;
  quantity: string | number;
  rate: string | number;
  discount?: string | number;
  description?: string;
  amount?: string | number;
}

/** Значения формы чека (v2). Имена полей — как в легаси (snake_case). */
export interface ReceiptFormValues {
  customer_id: string | number;
  deposit_account_id: string | number;
  receipt_date: string;
  receipt_number?: string;
  receipt_number_manually?: string;
  reference_no?: string;
  receipt_message?: string;
  terms_conditions?: string;
  closed?: string | boolean;
  exchange_rate?: string | number;
  currency_code?: string;
  branch_id?: string | number;
  warehouse_id?: string | number;
  project_id?: string | number;
  pdf_template_id?: string | number;
  entries: ReceiptEntryFormValues[];
  attachments?: unknown[];
  discount?: string | number;
  discount_type?: string;
  adjustment?: string | number;
}

/**
 * Zod-схема формы чека (замена Yup-схемы легаси).
 * Валидирует шапку; строки-позиции проверяются бизнес-правилом
 * «суммарное количество ≠ 0» в обработчике сохранения (как в легаси).
 * Используется с zodResolver(..., { raw: true }) — значения формы
 * не обрезаются до перечисленных ключей.
 */
export const getReceiptFormSchema = () =>
  z.object({
    customer_id: z
      .union([z.string(), z.number()])
      .refine((value) => String(value ?? '').trim() !== '', {
        message: intl.get('required'),
      }),
    deposit_account_id: z
      .union([z.string(), z.number()])
      .refine((value) => String(value ?? '').trim() !== '', {
        message: intl.get('required'),
      }),
    receipt_date: z.string().min(1, intl.get('required')),
    receipt_number: z.string().max(DATATYPES_LENGTH.STRING).optional(),
    reference_no: z.string().max(DATATYPES_LENGTH.STRING).optional(),
    receipt_message: z.string().max(DATATYPES_LENGTH.STRING).optional(),
    terms_conditions: z.string().max(DATATYPES_LENGTH.TEXT).optional(),
    entries: z.array(z.any()),
  });
