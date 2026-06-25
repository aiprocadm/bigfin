import { z } from 'zod';

/** id может прийти строкой (из input) или числом (из API). Пусто = невыбрано. */
const requiredId = z.union([z.string().min(1), z.number()]);
const optionalId = z.union([z.string(), z.number()]).nullable().optional();

export const categorizeTransactionSchema = z.object({
  amount: z.string().min(1),
  exchangeRate: z.string().min(1),
  transactionType: z.string().min(1),
  date: z.string().min(1),
  debitAccountId: optionalId,
  creditAccountId: requiredId,
  referenceNo: z.string().optional().default(''),
  description: z.string().optional().default(''),
  branchId: optionalId,
  contactId: z.number().nullable().optional(),
});

export type CategorizeTransactionFormValues = z.infer<
  typeof categorizeTransactionSchema
>;
