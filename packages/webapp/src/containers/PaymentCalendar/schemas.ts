import { z } from 'zod';
import intl from 'react-intl-universal';

export const getPlannedOperationSchema = () =>
  z.object({
    direction: z.enum(['inflow', 'outflow'], {
      errorMap: () => ({
        message: intl.get('payment_calendar.error.direction_required'),
      }),
    }),
    amount: z
      .number({
        invalid_type_error: intl.get('payment_calendar.error.amount_required'),
      })
      .positive(intl.get('payment_calendar.error.amount_required')),
    plannedDate: z
      .string()
      .min(1, intl.get('payment_calendar.error.date_required')),
    articleId: z.union([z.number(), z.null()]).optional(),
    accountId: z.union([z.number(), z.null()]).optional(),
    contactId: z.union([z.number(), z.null()]).optional(),
    description: z.string().optional(),
    repeat: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    interval: z.number().positive().optional(),
    endDate: z.string().optional(),
  });

export type PlannedOperationFormValues = z.infer<
  ReturnType<typeof getPlannedOperationSchema>
>;

export interface PlannedOperation {
  id: number;
  direction: 'inflow' | 'outflow';
  amount: number;
  plannedDate: string;
  articleId: number | null;
  accountId: number | null;
  contactId: number | null;
  description: string | null;
  recurrence: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: string;
  } | null;
}
