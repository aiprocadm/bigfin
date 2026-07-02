import { z } from 'zod';

/** Схема настроек счетов покупателям (Invoices). Оба поля необязательные. */
export const invoicesSchema = z.object({
  customerNotes: z.string().optional().default(''),
  termsConditions: z.string().optional().default(''),
});

export type InvoicesFormValues = z.infer<typeof invoicesSchema>;
