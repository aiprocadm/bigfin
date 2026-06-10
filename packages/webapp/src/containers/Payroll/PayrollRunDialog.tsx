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
import { payrollRunSchema, PayrollRunFormValues } from './schemas';
import { useCreatePayrollRun } from '@/hooks/query/payroll';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export function PayrollRunDialog({ onDone, onCancel }: Props) {
  const createMutation = useCreatePayrollRun({});

  const form = useForm<PayrollRunFormValues>({
    resolver: zodResolver(payrollRunSchema),
    defaultValues: {
      periodMonth: '',
      payDate: '',
      note: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: PayrollRunFormValues) => {
    try {
      await createMutation.mutateAsync({
        periodMonth: values.periodMonth + '-01',
        payDate: values.payDate,
        note: values.note || undefined,
      });
      toast.success(intl.get('payroll.run.saved'));
      onDone();
    } catch (err: any) {
      const hasType = (e: any, type: string) =>
        Boolean(e?.response?.data?.errors?.some((x: any) => x?.type === type));
      if (hasType(err, 'PAYROLL_RUN_MONTH_EXISTS')) {
        toast.error(intl.get('payroll.run.month_exists'));
      } else {
        toast.error(intl.get('payroll.run.create_error'));
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get('payroll.run.create')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="periodMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.run.month')}</FormLabel>
                  <FormControl>
                    <Input type="month" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.run.pay_date')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('payroll.run.note')}</FormLabel>
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
                {intl.get('payroll.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('payroll.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
