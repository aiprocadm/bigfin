import React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

/** Месяц в виде ГГГГ-ММ; пусто — «месяц платежа». */
export const ACCRUAL_PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * «Месяц начисления» денежной операции (FT-013 ТЗ-3).
 *
 * Аренду за декабрь заплатили 5 января: в отчёте о прибыли она нужна в
 * декабре, а в отчёте о деньгах — в январе. Поле необязательное: пусто —
 * операция идёт в прибыль месяцем платежа, как всегда.
 */
export function AccrualPeriodField({ name = 'accrual_period' }: { name?: string }) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{intl.get('accrual_period.label')}</FormLabel>
          <FormControl>
            <Input
              type="month"
              className="w-48"
              {...field}
              value={field.value ?? ''}
            />
          </FormControl>
          <FormDescription>{intl.get('accrual_period.hint')}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
