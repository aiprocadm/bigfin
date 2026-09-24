// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { MoneyField } from '@/components/ui/money-field';
import { useFixAccountBalance } from '@/hooks/query/cashflowAccounts';
import { showApiError } from '@/utils/showApiError';
import { fixBalanceResultMessage, todayIso } from './fixBalance';

const getSchema = () =>
  z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, intl.get('fix_balance.error.date_required')),
    amount: z.number({
      required_error: intl.get('fix_balance.error.amount_required'),
      invalid_type_error: intl.get('fix_balance.error.amount_required'),
    }),
  });

type FormValues = z.infer<ReturnType<typeof getSchema>>;

interface Props {
  accountId: number;
  accountName?: string;
  currencyCode?: string;
  onClose: () => void;
}

/**
 * «Зафиксировать остаток» (FT-071 ТЗ-3): человек переписывает остаток из
 * выписки на конец дня, Bigfin сам находит разницу с учётом и проводит её
 * корректирующей операцией. Сумма — в валюте счёта, как в выписке.
 */
export function FixAccountBalanceDialog({
  accountId,
  accountName,
  currencyCode = '',
  onClose,
}: Props) {
  const fixBalance = useFixAccountBalance();
  const schema = React.useMemo(getSchema, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayIso(), amount: undefined as any },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await fixBalance.mutateAsync({
        accountId,
        date: values.date,
        amount: values.amount,
      });
      const message = fixBalanceResultMessage(result, values.date, currencyCode);

      if (message.created) toast.success(message.text);
      else toast.info(message.text);
      onClose();
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.get('fix_balance.title')}</DialogTitle>
          <DialogDescription>
            {accountName
              ? intl.get('fix_balance.description_with_account', { account: accountName })
              : intl.get('fix_balance.description')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{intl.get('fix_balance.field.date')}</FormLabel>
                  <FormControl>
                    <DateField value={field.value} onChange={field.onChange} />
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
                  <FormLabel>{intl.get('fix_balance.field.amount')}</FormLabel>
                  <FormControl>
                    <MoneyField
                      ref={field.ref}
                      name={field.name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-sm text-text-secondary">
              {intl.get('fix_balance.hint')}
            </p>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onClose}>
                {intl.get('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {intl.get('fix_balance.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
