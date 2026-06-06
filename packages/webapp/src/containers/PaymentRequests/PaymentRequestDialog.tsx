// © 2026 Bigfin
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
import { useManagementArticles } from '@/hooks/query/managementArticles';
import { useAccounts } from '@/hooks/query/accounts';
import { getPaymentRequestSchema, PaymentRequestFormValues } from './schemas';
import { useCreatePaymentRequest } from '@/hooks/query/paymentRequests';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

interface ArticleRow {
  id: number;
  name: string;
  kind: string;
}
interface AccountRow {
  id: number;
  name: string;
  code?: string;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

export function PaymentRequestDialog({ onDone, onCancel }: Props) {
  const createMutation = useCreatePaymentRequest({});
  const { data: articles } = useManagementArticles({}, {});
  const { data: accounts } = useAccounts({}, {});

  const form = useForm<PaymentRequestFormValues>({
    resolver: zodResolver(getPaymentRequestSchema()),
    defaultValues: {
      amount: 0,
      dueDate: '',
      articleId: null,
      accountId: null,
      description: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  // Expense articles for payment requests (outflows).
  const articleOptions = React.useMemo<ArticleRow[]>(
    () => ((articles ?? []) as ArticleRow[]).filter((a) => a.kind === 'expense'),
    [articles],
  );

  const onSubmit = async (values: PaymentRequestFormValues) => {
    try {
      await createMutation.mutateAsync({
        amount: values.amount,
        dueDate: values.dueDate,
        articleId: values.articleId ?? undefined,
        accountId: values.accountId ?? undefined,
        description: values.description || undefined,
      });
      toast.success(intl.get('payment_requests.saved'));
      onDone();
    } catch {
      toast.error(intl.get('payment_requests.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get('payment_requests.create')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payment_requests.field.amount')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payment_requests.field.due_date')}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="articleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payment_requests.field.article')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value == null ? '' : String(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">—</option>
                      {articleOptions.map((a) => (
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
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payment_requests.field.account')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value == null ? '' : String(field.value)}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value),
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="">—</option>
                      {((accounts ?? []) as AccountRow[]).map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code ? `${acc.code} — ${acc.name}` : acc.name}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payment_requests.field.description')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {intl.get('payment_requests.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('payment_requests.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
