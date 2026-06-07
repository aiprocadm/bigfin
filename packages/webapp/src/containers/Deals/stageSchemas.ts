// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const getDealStageSchema = () =>
  z.object({
    name: z.string().min(1, intl.get('deal_stages.error.name_required')),
    plannedRevenue: z.coerce.number().nonnegative().optional(),
    plannedCost: z.coerce.number().nonnegative().optional(),
    sortOrder: z.coerce.number().optional(),
    status: z.enum(['open', 'closed']).optional(),
    closedDate: z.string().optional(),
  });

export type DealStageFormValues = z.infer<ReturnType<typeof getDealStageSchema>>;
