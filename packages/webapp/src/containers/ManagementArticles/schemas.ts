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
  sortOrder?: number;
  active?: boolean;
  amount?: number;
  children?: ManagementArticle[];
}
