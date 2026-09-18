import { z } from 'zod';
import intl from 'react-intl-universal';

export const getArticleFormSchema = () =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, intl.get('management_articles.error.name_required')),
    kind: z.enum(['income', 'expense'], {
      errorMap: () => ({
        message: intl.get('management_articles.error.kind_required'),
      }),
    }),
    cashflowSection: z
      .enum(['operating', 'investing', 'financing'])
      .optional()
      .or(z.literal('')),
    parentId: z.union([z.number(), z.null()]).optional(),
    accountIds: z.array(z.number()).optional(),
    // Пустая строка — «не выбрано»: <select> отдаёт именно её.
    costBehavior: z.enum(['fixed', 'variable']).or(z.literal('')).optional(),
  })
  /**
   * Пометка «постоянный / переменный» обязательна у расходных статей
   * (этап 9 ТЗ) и бессмысленна у доходных: у выручки постоянных и переменных
   * не бывает.
   *
   * Без пометки расход не попадает в постоянные затраты, и точка
   * безубыточности считается ближе, чем она есть, — то есть врёт в опасную
   * сторону. Поэтому спрашиваем сразу, при заведении статьи.
   */
  .superRefine((values, ctx) => {
    if (values.kind !== 'expense') return;
    if (values.costBehavior === 'fixed' || values.costBehavior === 'variable') {
      return;
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['costBehavior'],
      message: intl.get('management_articles.error.cost_behavior_required'),
    });
  });

export type ArticleFormValues = z.infer<ReturnType<typeof getArticleFormSchema>>;

/**
 * A management article as returned by the API (flat row, or a tree node when
 * children are present).
 */
export interface ManagementArticle {
  id: number;
  name: string;
  kind: 'income' | 'expense';
  parentId: number | null;
  cashflowSection: 'operating' | 'investing' | 'financing' | null;
  /** 'fixed' | 'variable' | null — только у расходных статей. */
  costBehavior?: 'fixed' | 'variable' | null;
  sortOrder?: number;
  active?: boolean;
  amount?: number;
  accounts?: { id: number }[];
  children?: ManagementArticle[];
}
