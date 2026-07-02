import { z } from 'zod';

/** Схема настроек чеков (Receipts). Оба поля необязательные. */
export const receiptsSchema = z.object({
  receiptMessage: z.string().optional().default(''),
  termsConditions: z.string().optional().default(''),
});

export type ReceiptsFormValues = z.infer<typeof receiptsSchema>;
