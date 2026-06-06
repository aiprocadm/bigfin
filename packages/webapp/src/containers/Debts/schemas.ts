// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getRepaymentPlanSchema = () =>
  z.object({
    side: z.enum(['receivable', 'payable']),
    contactId: z.number().int().positive(),
    description: z.string().trim().optional(),
    installments: z
      .array(
        z.object({
          dueDate: z
            .string()
            .min(1, intl.get('debts.error.installment_date_required')),
          amount: z
            .number()
            .positive(intl.get('debts.error.installment_amount_positive')),
          note: z.string().trim().optional(),
        }),
      )
      .min(1, intl.get('debts.error.installments_required')),
  });

export type RepaymentPlanFormValues = z.infer<
  ReturnType<typeof getRepaymentPlanSchema>
>;
