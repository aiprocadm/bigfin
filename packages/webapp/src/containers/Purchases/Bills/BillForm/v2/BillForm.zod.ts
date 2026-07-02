import moment from 'moment';
import intl from 'react-intl-universal';
import { z } from 'zod';
import { DATATYPES_LENGTH } from '@/constants/dataTypes';

/**
 * Значения строки-позиции счёта поставщика в форме (v2, RHF).
 * Инпуты дают строки; в режиме редактирования сервер может дать числа —
 * тип терпим к обоим, нормализация происходит в utils.
 */
export interface BillEntryFormValues {
  index?: number;
  item_id: string | number;
  quantity: string | number;
  rate: string | number;
  discount?: string | number;
  description?: string;
  /** Признак дополнительной стоимости (landed cost) — сохраняем сквозняком. */
  landed_cost?: boolean;
  landed_cost_disabled?: boolean;
  tax_rate_id?: string | number;
  tax_rate?: string | number;
  tax_amount?: string | number;
  amount?: string | number;
}

/** Значения формы счёта поставщика (v2). Имена полей — как в легаси. */
export interface BillFormValues {
  vendor_id: string | number;
  bill_date: string;
  due_date: string;
  bill_number?: string;
  reference_no?: string;
  inclusive_exclusive_tax: string;
  note?: string;
  open?: string | boolean;
  exchange_rate?: string | number;
  currency_code?: string;
  branch_id?: string | number;
  warehouse_id?: string | number;
  project_id?: string | number;
  entries: BillEntryFormValues[];
  attachments?: unknown[];
  discount?: string | number;
  discount_type?: string;
  adjustment?: string | number;
}

/**
 * Zod-схема формы счёта поставщика (замена Yup-схемы легаси).
 * Валидирует шапку; строки-позиции проверяются бизнес-правилом
 * «суммарное количество ≠ 0» в обработчике сохранения (как в легаси).
 * Используется с zodResolver(..., { raw: true }) — значения формы
 * не обрезаются до перечисленных ключей.
 */
export const getBillFormSchema = () =>
  z
    .object({
      vendor_id: z
        .union([z.string(), z.number()])
        .refine((value) => String(value ?? '').trim() !== '', {
          message: intl.get('required'),
        }),
      bill_date: z.string().min(1, intl.get('required')),
      due_date: z.string().min(1, intl.get('required')),
      bill_number: z.string().max(DATATYPES_LENGTH.STRING).optional(),
      reference_no: z.string().max(DATATYPES_LENGTH.STRING).optional(),
      note: z.string().max(DATATYPES_LENGTH.TEXT).optional(),
      entries: z.array(z.any()),
    })
    .superRefine((values, ctx) => {
      // Срок оплаты не может быть раньше даты счёта (легаси: Yup .min(ref)).
      if (
        values.bill_date &&
        values.due_date &&
        values.due_date < values.bill_date
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['due_date'],
          message: intl.get('bill.validation.due_date', {
            path: intl.get('due_date_'),
            min: moment(values.bill_date).format('YYYY/MM/DD'),
          }),
        });
      }
    });
