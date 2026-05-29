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
import { getArticleFormSchema } from './schemas';
import {
  useCreateManagementArticle,
  useEditManagementArticle,
} from '@/hooks/query/managementArticles';

interface ArticleFormProps {
  article?: any; // when set -> edit mode
  onDone: () => void;
  onCancel: () => void;
}

export function ArticleForm({ article, onDone, onCancel }: ArticleFormProps) {
  const isEdit = !!article?.id;
  // Hooks from legacy JS module — cast mutateAsync to accept correct args
  const createMutation = useCreateManagementArticle({}) as unknown as {
    mutateAsync: (values: Record<string, unknown>) => Promise<unknown>;
  };
  const editMutation = useEditManagementArticle({}) as unknown as {
    mutateAsync: (args: [string | number, Record<string, unknown>]) => Promise<unknown>;
  };

  const form = useForm({
    resolver: zodResolver(getArticleFormSchema()),
    defaultValues: {
      name: article?.name ?? '',
      kind: article?.kind ?? 'expense',
      cashflowSection: article?.cashflowSection ?? '',
      parentId: article?.parentId ?? null,
    },
  });

  const onSubmit = async (values: any) => {
    const payload = {
      name: values.name,
      kind: values.kind,
      cashflowSection: values.cashflowSection || undefined,
      parentId: values.parentId ?? undefined,
    };
    if (isEdit) {
      await editMutation.mutateAsync([article.id, payload]);
    } else {
      await createMutation.mutateAsync(payload);
    }
    toast.success(intl.get('management_articles.saved'));
    onDone();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.get(isEdit ? 'management_articles.edit' : 'management_articles.add')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('management_articles.field.name')}</FormLabel>
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
                  <FormLabel>{intl.get('management_articles.field.kind')}</FormLabel>
                  <FormControl>
                    <select
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onCancel}>
                {intl.get('management_articles.cancel')}
              </Button>
              <Button type="submit">{intl.get('management_articles.save')}</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
