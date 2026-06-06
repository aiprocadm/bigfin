// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getPaymentRequestSchema = () =>
  z.object({
    amount: z.number().positive(intl.get('payment_requests.error.amount_positive')),
    dueDate: z
      .string()
      .min(1, intl.get('payment_requests.error.due_date_required')),
    articleId: z.number().nullable().optional(),
    accountId: z.number().nullable().optional(),
    description: z.string().optional(),
  });

export type PaymentRequestFormValues = z.infer<
  ReturnType<typeof getPaymentRequestSchema>
>;
