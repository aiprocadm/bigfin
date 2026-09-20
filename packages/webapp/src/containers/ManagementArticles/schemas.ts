import { z } from 'zod';
import intl from 'react-intl-universal';

export const getArticleFormSchema = () =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, intl.get('management_articles.error.name_required')),
    kind: z.enum(['income', 'expense', 'asset', 'liability', 'equity'], {
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
  })
  /**
   * У балансовой статьи раздел движения денег ОБЯЗАТЕЛЕН (этап 17 ТЗ-2).
   *
   * В отчёте о прибыли балансовых статей нет вовсе, а в ДДС строка встаёт
   * именно по разделу. Статья без раздела видна в справочнике, ею можно
   * разметить платёж — и сумма не появится ни в одном отчёте. Тишина, а не
   * ошибка: заметят её через месяц, когда цифры не сойдутся.
   *
   * То же правило стоит на сервере. Здесь оно продублировано, чтобы человек
   * узнал о нём до отправки формы, а не отказом без объяснения.
   */
  .superRefine((values, ctx) => {
    const isBalanceKind = !PL_ARTICLE_KINDS.includes(values.kind);
    if (!isBalanceKind) return;
    if (values.cashflowSection) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['cashflowSection'],
      message: intl.get(
        'management_articles.error.cashflow_section_required',
      ),
    });
  });

export type ArticleFormValues = z.infer<ReturnType<typeof getArticleFormSchema>>;

/** Пять видов статьи учёта (FIN-001 ТЗ-2). */
export type ArticleKind =
  | 'income'
  | 'expense'
  | 'asset'
  | 'liability'
  | 'equity';

/** Виды, у которых есть отчёт о прибыли; у остальных его нет. */
export const PL_ARTICLE_KINDS: ArticleKind[] = ['income', 'expense'];

/**
 * Статья учёта в том виде, в каком её отдаёт сервер: плоская строка либо
 * узел дерева, когда пришли дети.
 */
export interface ManagementArticle {
  id: number;
  name: string;
  kind: ArticleKind;
  parentId: number | null;
  cashflowSection: 'operating' | 'investing' | 'financing' | null;
  /** 'fixed' | 'variable' | null — только у расходных статей. */
  costBehavior?: 'fixed' | 'variable' | null;
  sortOrder?: number;
  active?: boolean;
  /**
   * Устойчивый ключ системной статьи; у заведённых человеком — `null`.
   * По нему ставится замок: переименовать можно, удалить нельзя.
   */
  seedKey?: string | null;
  amount?: number;
  accounts?: { id: number }[];
  children?: ManagementArticle[];
}
