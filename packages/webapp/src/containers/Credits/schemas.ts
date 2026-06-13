// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getCreateCreditSchema = () =>
  z.object({
    name: z.string().trim().min(1, intl.get('credits.field.name')),
    lender: z.string().trim().optional(),
    principalAmount: z
      .number({ invalid_type_error: intl.get('credits.field.principal') })
      .positive(),
    annualInterestRate: z
      .number({ invalid_type_error: intl.get('credits.field.rate') })
      .min(0),
    termMonths: z
      .number({ invalid_type_error: intl.get('credits.field.term') })
      .int()
      .positive(),
    startDate: z.string().min(1),
    scheduleType: z.enum(['annuity', 'differentiated']),
    paymentAccountId: z
      .number({ invalid_type_error: intl.get('credits.field.account') })
      .int()
      .positive(),
    note: z.string().trim().optional(),
  });

export type CreateCreditFormValues = z.infer<
  ReturnType<typeof getCreateCreditSchema>
>;
