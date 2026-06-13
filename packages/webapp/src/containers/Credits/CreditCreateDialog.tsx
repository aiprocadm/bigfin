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
import { useAccounts } from '@/hooks/query';
import { useCreateCredit } from '@/hooks/query/credits';
import { getCreateCreditSchema, CreateCreditFormValues } from './schemas';

const CASH_ACCOUNT_TYPES = ['cash', 'bank'];

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export function CreditCreateDialog({ onDone, onCancel }: Props) {
  const createMutation = useCreateCredit({});
  const { data: accounts } = useAccounts({}, {});

  const cashAccounts: any[] = (accounts ?? []).filter((a: any) =>
    CASH_ACCOUNT_TYPES.includes(a.account_type ?? a.accountType),
  );

  const form = useForm<CreateCreditFormValues>({
    resolver: zodResolver(getCreateCreditSchema()),
    defaultValues: {
      name: '',
      lender: '',
      principalAmount: undefined as any,
      annualInterestRate: undefined as any,
      termMonths: undefined as any,
      startDate: today(),
      scheduleType: 'annuity',
      paymentAccountId: undefined as any,
      note: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: CreateCreditFormValues) => {
    try {
      await createMutation.mutateAsync({
        name: values.name,
        lender: values.lender || undefined,
        principalAmount: values.principalAmount,
        annualInterestRate: values.annualInterestRate,
        termMonths: values.termMonths,
        startDate: values.startDate,
        scheduleType: values.scheduleType,
        paymentAccountId: values.paymentAccountId,
        note: values.note || undefined,
      });
      toast.success(intl.get('credits.toast.created'));
      onDone();
    } catch {
      toast.error(intl.get('credits.toast.error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get('credits.dialog.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('credits.field.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Lender */}
            <FormField
              control={form.control}
              name="lender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('credits.field.lender')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Principal + Rate */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="principalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('credits.field.principal')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
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
                name="annualInterestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('credits.field.rate')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
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
            </div>

            {/* Term + Start Date */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="termMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('credits.field.term')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {intl.get('credits.field.start_date')}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Schedule type */}
            <FormField
              control={form.control}
              name="scheduleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('credits.field.schedule_type')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      name={field.name}
                      ref={field.ref as React.Ref<HTMLSelectElement>}
                    >
                      <option value="annuity">
                        {intl.get('credits.schedule.annuity')}
                      </option>
                      <option value="differentiated">
                        {intl.get('credits.schedule.differentiated')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account (cash/bank) */}
            <FormField
              control={form.control}
              name="paymentAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('credits.field.account')}</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                        )
                      }
                      name={field.name}
                      ref={field.ref as React.Ref<HTMLSelectElement>}
                    >
                      <option value="">—</option>
                      {cashAccounts.map((a: any) => (
                        <option key={a.id} value={String(a.id)}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <p className="text-muted-foreground text-xs">
                    {intl.get('credits.hint.account')}
                  </p>
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
                {intl.get('credits.action.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('credits.action.new')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
