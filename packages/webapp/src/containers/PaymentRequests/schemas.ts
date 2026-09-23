// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getPaymentRequestSchema = () =>
  z.object({
    amount: z.number().positive(intl.get('payment_requests.error.amount_positive')),
    // Срок необязателен, если есть плановые оплаты (FT-053 ТЗ-3): тогда
    // он — первая оплата. Проверка «срок или оплаты» — при отправке.
    dueDate: z.string().optional(),
    articleId: z.number().nullable().optional(),
    accountId: z.number().nullable().optional(),
    description: z.string().optional(),
    documentUrl: z.string().max(1000).optional(),
    justification: z.string().max(5000).optional(),
  });

export type PaymentRequestFormValues = z.infer<
  ReturnType<typeof getPaymentRequestSchema>
>;
