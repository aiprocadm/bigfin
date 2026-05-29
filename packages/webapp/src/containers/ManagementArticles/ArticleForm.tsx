import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ACCOUNT_ROOT_TYPE } from '@/constants/accountTypes';
import { useAccounts } from '@/hooks/query/accounts';
import {
  getArticleFormSchema,
  ArticleFormValues,
  ManagementArticle,
} from './schemas';
import {
  useManagementArticles,
  useManagementArticle,
  useCreateManagementArticle,
  useEditManagementArticle,
} from '@/hooks/query/managementArticles';

interface ArticleFormProps {
  article?: ManagementArticle; // when set -> edit mode
  onDone: () => void;
  onCancel: () => void;
}

interface AccountRow {
  id: number;
  name: string;
  code?: string;
  account_root_type?: string;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

// Only profit & loss accounts make sense on a management P&L article — this
// keeps balance-sheet accounts (banks, assets, liabilities) out of the picker.
const PL_ROOT_TYPES: string[] = [
  ACCOUNT_ROOT_TYPE.INCOME,
  ACCOUNT_ROOT_TYPE.EXPENSE,
];

/**
 * Collects the ids of every descendant of `rootId` from a flat article list,
 * so the parent picker can exclude the article's own subtree (prevents cycles).
 */
function collectDescendantIds(
  articles: ManagementArticle[],
  rootId: number,
): number[] {
  const childrenByParent = new Map<number | null, number[]>();
  articles.forEach((a) => {
    const siblings = childrenByParent.get(a.parentId) ?? [];
    siblings.push(a.id);
    childrenByParent.set(a.parentId, siblings);
  });

  const descendants: number[] = [];
  const stack: number[] = [rootId];
  while (stack.length > 0) {
    const current = stack.pop() as number;
    (childrenByParent.get(current) ?? []).forEach((childId) => {
      descendants.push(childId);
      stack.push(childId);
    });
  }
  return descendants;
}

export function ArticleForm({ article, onDone, onCancel }: ArticleFormProps) {
  const isEdit = !!article?.id;

  const createMutation = useCreateManagementArticle({});
  const editMutation = useEditManagementArticle({});

  // Flat list of all articles — used to populate the parent picker.
  const { data: allArticles } = useManagementArticles({}, {});
  // All accounts — filtered to P&L for the accounts picker.
  const { data: accounts } = useAccounts({}, {});
  // In edit mode, fetch the full article to pre-fill its mapped accounts.
  const articleQuery = useManagementArticle(article?.id ?? 0, {
    enabled: isEdit,
  });
  const fullArticle = articleQuery.data;

  const parentOptions = React.useMemo<ManagementArticle[]>(() => {
    const list: ManagementArticle[] = allArticles ?? [];
    if (!isEdit || !article) return list;
    const excluded = new Set<number>([
      article.id,
      ...collectDescendantIds(list, article.id),
    ]);
    return list.filter((a) => !excluded.has(a.id));
  }, [allArticles, isEdit, article]);

  const plAccounts = React.useMemo<AccountRow[]>(() => {
    const list: AccountRow[] = accounts ?? [];
    return list.filter(
      (a) => !!a.account_root_type && PL_ROOT_TYPES.includes(a.account_root_type),
    );
  }, [accounts]);

  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(getArticleFormSchema()),
    defaultValues: {
      name: article?.name ?? '',
      kind: article?.kind ?? 'expense',
      cashflowSection: article?.cashflowSection ?? '',
      parentId: article?.parentId ?? null,
      accountIds: article?.accounts?.map((a) => a.id) ?? [],
    },
  });

  // Pre-fill mapped accounts once the full article arrives (edit mode).
  React.useEffect(() => {
    if (isEdit && fullArticle?.accounts) {
      form.setValue(
        'accountIds',
        fullArticle.accounts.map((a: { id: number }) => a.id),
        { shouldDirty: false },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullArticle]);

  const isSubmitting = form.formState.isSubmitting;
  // Avoid wiping mappings: in edit mode, wait until the article (with its
  // accounts) has loaded before allowing a save.
  const accountsReady = !isEdit || Boolean(fullArticle?.id);

  const onSubmit = async (values: ArticleFormValues) => {
    const payload = {
      name: values.name,
      kind: values.kind,
      cashflowSection: values.cashflowSection || undefined,
      parentId: values.parentId ?? undefined,
      accountIds: values.accountIds ?? [],
    };
    try {
      if (isEdit && article) {
        await editMutation.mutateAsync([article.id, payload]);
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('management_articles.saved'));
      onDone();
    } catch (error) {
      toast.error(intl.get('management_articles.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.get(
            isEdit ? 'management_articles.edit' : 'management_articles.add',
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('management_articles.field.name')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('management_articles.field.kind')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="income">
                        {intl.get('management_articles.kind.income')}
                      </option>
                      <option value="expense">
                        {intl.get('management_articles.kind.expense')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('management_articles.field.parent')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value == null ? '' : String(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? null
                            : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">—</option>
                      {parentOptions.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cashflowSection"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('management_articles.field.cashflow_section')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">—</option>
                      <option value="operating">
                        {intl.get(
                          'management_articles.cashflow_section.operating',
                        )}
                      </option>
                      <option value="investing">
                        {intl.get(
                          'management_articles.cashflow_section.investing',
                        )}
                      </option>
                      <option value="financing">
                        {intl.get(
                          'management_articles.cashflow_section.financing',
                        )}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountIds"
              render={({ field }) => {
                const selected = field.value ?? [];
                return (
                  <FormItem>
                    <FormLabel>
                      {intl.get('management_articles.field.accounts')}
                    </FormLabel>
                    <FormControl>
                      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-2">
                        {plAccounts.length === 0 ? (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        ) : (
                          plAccounts.map((acc) => (
                            <label
                              key={acc.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(acc.id)}
                                onChange={(e) => {
                                  const next = new Set<number>(selected);
                                  if (e.target.checked) next.add(acc.id);
                                  else next.delete(acc.id);
                                  field.onChange(Array.from(next));
                                }}
                              />
                              <span>
                                {acc.code ? `${acc.code} — ${acc.name}` : acc.name}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {intl.get('management_articles.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !accountsReady}>
                {intl.get('management_articles.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
