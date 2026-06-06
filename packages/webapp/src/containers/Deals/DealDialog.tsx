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
import { useCustomers } from '@/hooks/query/customers';
import { useCreateDeal, useEditDeal } from '@/hooks/query/deals';
import { getDealSchema, DealFormValues } from './schemas';

interface Props {
  deal?: any; // when present → edit mode
  onDone: () => void;
  onCancel: () => void;
}

interface CustomerRow {
  id: number;
  display_name?: string;
  displayName?: string;
}

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const STATUS_OPTIONS = ['in_progress', 'completed', 'cancelled'];

export function DealDialog({ deal, onDone, onCancel }: Props) {
  const isEdit = !!deal?.id;
  const createMutation = useCreateDeal({});
  const editMutation = useEditDeal({});
  const { data: customersData } = useCustomers({}, {});
  const customers: CustomerRow[] =
    (customersData as any)?.customers ?? (customersData as any) ?? [];

  const form = useForm<DealFormValues>({
    resolver: zodResolver(getDealSchema()),
    defaultValues: {
      name: deal?.name ?? '',
      contactId: deal?.contactId ?? null,
      deadline: deal?.deadline ?? '',
      costEstimate: deal?.costEstimate ?? null,
      status: deal?.status ?? 'in_progress',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: DealFormValues) => {
    const payload = {
      name: values.name,
      contactId: values.contactId ?? undefined,
      deadline: values.deadline || undefined,
      costEstimate: values.costEstimate ?? undefined,
      status: values.status || undefined,
    };
    try {
      if (isEdit) {
        await editMutation.mutateAsync([deal.id, payload]);
      } else {
        await createMutation.mutateAsync(payload);
      }
      toast.success(intl.get('deals.saved'));
      onDone();
    } catch {
      toast.error(intl.get('deals.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.get(isEdit ? 'deals.edit_title' : 'deals.create')}
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
                  <FormLabel>{intl.get('deals.field.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.client')}</FormLabel>
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
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.display_name ?? c.displayName ?? `#${c.id}`}
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
              name="deadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.deadline')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="costEstimate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.budget')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === '' ? null : Number(e.target.value),
                        )
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('deals.field.status')}</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ?? 'in_progress'}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {intl.get(`deals.status.${s}`)}
                        </option>
                      ))}
                    </select>
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
                {intl.get('deals.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('deals.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
