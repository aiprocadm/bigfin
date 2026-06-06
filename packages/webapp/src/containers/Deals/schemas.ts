// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getDealSchema = () =>
  z.object({
    name: z.string().min(1, intl.get('deals.error.name_required')),
    contactId: z.number().nullable().optional(),
    deadline: z.string().optional(),
    costEstimate: z
      .number()
      .nonnegative(intl.get('deals.error.budget_nonnegative'))
      .nullable()
      .optional(),
    status: z.string().optional(),
  });

export type DealFormValues = z.infer<ReturnType<typeof getDealSchema>>;
