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
import {
  getPlannedOperationSchema,
  PlannedOperationFormValues,
  PlannedOperation,
} from './schemas';
import {
  useCreatePlannedOperation,
  useEditPlannedOperation,
} from '@/hooks/query/paymentCalendar';

interface Props {
  operation?: PlannedOperation;
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

export function PlannedOperationDialog({ operation, onDone, onCancel }: Props) {
  const isEdit = !!operation?.id;
  const createMutation = useCreatePlannedOperation({});
  const editMutation = useEditPlannedOperation({});

  const { data: articles } = useManagementArticles({}, {});
  const { data: accounts } = useAccounts({}, {});

  const form = useForm<PlannedOperationFormValues>({
    resolver: zodResolver(getPlannedOperationSchema()),
    defaultValues: {
      direction: operation?.direction ?? 'inflow',
      amount: operation?.amount ?? 0,
      plannedDate: operation?.plannedDate ?? '',
      articleId: operation?.articleId ?? null,
      accountId: operation?.accountId ?? null,
      contactId: operation?.contactId ?? null,
      description: operation?.description ?? '',
      repeat: !!operation?.recurrence,
      frequency: operation?.recurrence?.frequency ?? 'monthly',
      interval: operation?.recurrence?.interval ?? 1,
      endDate: operation?.recurrence?.endDate ?? '',
    },
  });

  const repeat = form.watch('repeat');
  const direction = form.watch('direction');

  // Income articles for inflows, expense articles for outflows.
  const articleOptions = React.useMemo<ArticleRow[]>(() => {
    const list: ArticleRow[] = articles ?? [];
    const wantKind = direction === 'inflow' ? 'income' : 'expense';
    return list.filter((a) => a.kind === wantKind);
  }, [articles, direction]);

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: PlannedOperationFormValues) => {
    const payload = {
      direction: values.direction,
      amount: values.amount,
      plannedDate: values.plannedDate,
      articleId: values.articleId ?? undefined,
      accountId: values.accountId ?? undefined,
      contactId: values.contactId ?? undefined,
      description: values.description || undefined,
      recurrence: values.repeat
        ? {
            frequency: values.frequency ?? 'monthly',
            interval: values.interval ?? 1,
            endDate: values.endDate || undefined,
          }
        : null,
    };
    try {
      if (isEdit && operation) {
        await editMutation.mutateAsync([operation.id, payload]);
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('payment_calendar.saved'));
      onDone();
    } catch (e) {
      toast.error(intl.get('payment_calendar.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.get(isEdit ? 'payment_calendar.edit' : 'payment_calendar.add')}
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
              name="direction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payment_calendar.field.direction')}
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
                      <option value="inflow">
                        {intl.get('payment_calendar.direction.inflow')}
                      </option>
                      <option value="outflow">
                        {intl.get('payment_calendar.direction.outflow')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payment_calendar.field.amount')}
                  </FormLabel>
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
              name="plannedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payment_calendar.field.date')}
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
                    {intl.get('payment_calendar.field.article')}
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
                    {intl.get('payment_calendar.field.account')}
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
                    {intl.get('payment_calendar.field.description')}
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
              name="repeat"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    <span>{intl.get('payment_calendar.field.repeat')}</span>
                  </label>
                </FormItem>
              )}
            />
            {repeat && (
              <div className="flex flex-col gap-4 rounded-md border p-3">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {intl.get('payment_calendar.field.frequency')}
                      </FormLabel>
                      <FormControl>
                        <select
                          className={selectClassName}
                          value={field.value ?? 'monthly'}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        >
                          <option value="daily">
                            {intl.get('payment_calendar.frequency.daily')}
                          </option>
                          <option value="weekly">
                            {intl.get('payment_calendar.frequency.weekly')}
                          </option>
                          <option value="monthly">
                            {intl.get('payment_calendar.frequency.monthly')}
                          </option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {intl.get('payment_calendar.field.interval')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? 1}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {intl.get('payment_calendar.field.end_date')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {intl.get('payment_calendar.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('payment_calendar.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
