// © 2026 Bigfin
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { installmentsPayload, installmentsState, type InstallmentRow } from './requestInstallments';
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
import { DateField } from '@/components/ui/date-field';
import { MoneyField } from '@/components/ui/money-field';

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
  'border-input bg-background h-9 w-full rounded-control border px-3 text-sm';

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
  // Плановые оплаты (FT-053 ТЗ-3): несколько дат, сумм и счетов в заявке.
  const [installments, setInstallments] = React.useState<InstallmentRow[]>([]);
  const [asDraft, setAsDraft] = React.useState(false);
  const amount = form.watch('amount');
  const plan = installmentsState(amount, installments);
  const addInstallment = () =>
    setInstallments((rows) => [
      ...rows,
      { key: `i${Date.now()}`, dueDate: '', amount: plan.remaining > 0 ? plan.remaining : undefined, accountId: null },
    ]);
  const updateInstallment = (key: string, patch: Partial<InstallmentRow>) =>
    setInstallments((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  // Expense articles for payment requests (outflows).
  const articleOptions = React.useMemo<ArticleRow[]>(
    () => ((articles ?? []) as ArticleRow[]).filter((a) => a.kind === 'expense'),
    [articles],
  );

  const onSubmit = async (values: PaymentRequestFormValues) => {
    const parts = installmentsPayload(installments);
    if (!values.dueDate && parts.length === 0) {
      form.setError('dueDate', { message: intl.get('payment_requests.error.due_date_required') });
      return;
    }
    if (!plan.ok) {
      toast.error(intl.get('payment_requests.installments.not_balanced'));
      return;
    }
    try {
      await createMutation.mutateAsync({
        amount: values.amount,
        dueDate: values.dueDate || undefined,
        articleId: values.articleId ?? undefined,
        accountId: values.accountId ?? undefined,
        description: values.description || undefined,
        documentUrl: values.documentUrl || undefined,
        justification: values.justification || undefined,
        installments: parts.length ? parts : undefined,
        asDraft,
      });
      toast.success(intl.get(asDraft ? 'payment_requests.saved_draft' : 'payment_requests.saved'));
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
                    <MoneyField
                      value={field.value}
                      onChange={(value) => field.onChange(value ?? 0)}
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
                    <DateField
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
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
            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payment_requests.field.justification')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payment_requests.field.document_url')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="https://" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Несколько плановых оплат (FT-053 ТЗ-3). */}
            <div className="flex flex-col gap-2 rounded-control border p-3 text-sm">
              <span className="font-medium">{intl.get('payment_requests.installments.title')}</span>
              {installments.map((row) => (
                <div key={row.key} className="flex flex-wrap items-center gap-2">
                  <DateField value={row.dueDate} onChange={(value) => updateInstallment(row.key, { dueDate: value })} />
                  <MoneyField
                    className="w-36"
                    value={row.amount ?? ''}
                    onChange={(value) => updateInstallment(row.key, { amount: value })}
                  />
                  <select
                    className={`${selectClassName} w-48`}
                    aria-label={intl.get('payment_requests.field.account')}
                    value={row.accountId ?? ''}
                    onChange={(e) => updateInstallment(row.key, { accountId: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">{intl.get('payment_requests.installments.request_account')}</option>
                    {((accounts ?? []) as AccountRow[]).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setInstallments((rows) => rows.filter((item) => item.key !== row.key))}
                  >
                    {intl.get('payment_requests.installments.remove')}
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={addInstallment}>
                  {intl.get('payment_requests.installments.add')}
                </Button>
                {installments.length > 0 && (
                  <span className={plan.remaining === 0 ? 'text-text-secondary' : 'text-danger'}>
                    {intl.get('payment_requests.installments.remaining', { amount: formatOrganizationMoney(plan.remaining) })}
                  </span>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} />
              {intl.get('payment_requests.as_draft')}
            </label>

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
