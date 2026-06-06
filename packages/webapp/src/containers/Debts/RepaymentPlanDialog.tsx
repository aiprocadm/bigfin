// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { getRepaymentPlanSchema, RepaymentPlanFormValues } from './schemas';
import { useCreateRepaymentPlan } from '@/hooks/query/debts';

interface Props {
  side: 'receivable' | 'payable';
  contactId: number;
  onDone: () => void;
  onCancel: () => void;
}

export function RepaymentPlanDialog({
  side,
  contactId,
  onDone,
  onCancel,
}: Props) {
  const createMutation = useCreateRepaymentPlan({});

  const form = useForm<RepaymentPlanFormValues>({
    resolver: zodResolver(getRepaymentPlanSchema()),
    defaultValues: {
      side,
      contactId,
      description: '',
      installments: [{ dueDate: '', amount: 0, note: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'installments',
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: RepaymentPlanFormValues) => {
    try {
      await createMutation.mutateAsync({
        side: values.side,
        contactId: values.contactId,
        description: values.description || undefined,
        installments: values.installments.map((i) => ({
          dueDate: i.dueDate,
          amount: i.amount,
          note: i.note || undefined,
        })),
      });
      toast.success(intl.get('debts.plan.saved'));
      onDone();
    } catch {
      toast.error(intl.get('debts.plan.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get('debts.plan.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('debts.plan.description')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {intl.get('debts.plan.installments')}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => append({ dueDate: '', amount: 0, note: '' })}
                >
                  {intl.get('debts.plan.add_installment')}
                </Button>
              </div>

              {fields.map((f, idx) => (
                <div
                  key={f.id}
                  className="flex items-end gap-2 rounded-md border p-2"
                >
                  <FormField
                    control={form.control}
                    name={`installments.${idx}.dueDate`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{intl.get('debts.plan.due_date')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`installments.${idx}.amount`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>{intl.get('debts.plan.amount')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            value={field.value}
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
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(idx)}
                    disabled={fields.length <= 1}
                  >
                    {intl.get('debts.plan.remove')}
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {intl.get('debts.plan.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('debts.plan.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
