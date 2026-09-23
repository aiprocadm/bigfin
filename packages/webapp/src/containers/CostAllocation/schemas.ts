// © 2026 Bigfin
import { z } from 'zod';
import intl from 'react-intl-universal';

// Пять баз распределения (FT-011 ТЗ-3) — тот же список, что на сервере.
export const ALLOCATION_KEYS = [
  'revenue',
  'production_payroll',
  'gross_profit_1',
  'equal',
  'manual_share',
] as const;

/** Между кем делится пул: сделки или направления (FT-011 ТЗ-3). */
export const ALLOCATION_TARGET_TYPES = ['deal', 'direction'] as const;

export const getCostAllocationRuleSchema = () =>
  z.object({
    name: z.string().min(1, intl.get('cost_allocation.error.name_required')),
    sourceArticleId: z.number().int().positive(
      intl.get('cost_allocation.error.source_article_required'),
    ),
    allocationKey: z.enum(ALLOCATION_KEYS),
    manualShares: z.record(z.number().nonnegative()).optional(),
    targetDealIds: z.array(z.number()).optional(),
    targetType: z.enum(ALLOCATION_TARGET_TYPES).optional(),
    validFrom: z.string().optional(),
    validTo: z.string().optional(),
    isActive: z.boolean().optional(),
  });

export type CostAllocationRuleFormValues = z.infer<
  ReturnType<typeof getCostAllocationRuleSchema>
>;
