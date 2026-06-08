// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

export const ALLOCATION_KEYS = ['revenue', 'manual_share'] as const;

export const getCostAllocationRuleSchema = () =>
  z.object({
    name: z.string().min(1, intl.get('cost_allocation.error.name_required')),
    sourceArticleId: z.number().int().positive(
      intl.get('cost_allocation.error.source_article_required'),
    ),
    allocationKey: z.enum(ALLOCATION_KEYS),
    manualShares: z.record(z.number().nonnegative()).optional(),
    targetDealIds: z.array(z.number()).optional(),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    isActive: z.boolean().optional(),
  });

export type CostAllocationRuleFormValues = z.infer<
  ReturnType<typeof getCostAllocationRuleSchema>
>;
