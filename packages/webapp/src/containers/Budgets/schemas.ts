import { z } from 'zod';
import intl from 'react-intl-universal';

export const getBudgetSchema = () =>
  z.object({
    name: z.string().trim().min(1, intl.get('budgets.error.name_required')),
    type: z.enum(['bdir', 'bdds'], {
      errorMap: () => ({ message: intl.get('budgets.error.type_required') }),
    }),
    fiscalYear: z.number().int(),
    activeScenario: z
      .enum(['optimistic', 'realistic', 'pessimistic'])
      .optional(),
    branchId: z.union([z.number(), z.null()]).optional(),
  });

export type BudgetFormValues = z.infer<ReturnType<typeof getBudgetSchema>>;

export interface Budget {
  id: number;
  name: string;
  type: 'bdir' | 'bdds';
  fiscalYear: number;
  activeScenario: string;
  branchId: number | null;
  lines?: Array<{
    articleId: number;
    period: string;
    scenario: string;
    plannedAmount: number;
  }>;
}
