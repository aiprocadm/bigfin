import React from 'react';
import intl from 'react-intl-universal';
import { useFormContext, useWatch } from 'react-hook-form';

import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReceiptFormValues } from './ReceiptForm.zod';
import { useReceiptFormV2Context } from './ReceiptFormV2.types';
import {
  computeReceiptTotals,
  formatReceiptAmount,
} from './ReceiptFormV2.utils';

/** Строка блока итогов: подпись слева, сумма справа (tabular-nums). */
function TotalRow({
  label,
  value,
  bold = false,
  control,
}: {
  label: React.ReactNode;
  value: string;
  bold?: boolean;
  control?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span>{label}</span>
        {control}
      </div>
      <span
        className={
          bold
            ? 'text-sm font-semibold tabular-nums text-text-primary'
            : 'text-sm tabular-nums text-text-primary'
        }
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Итоги чека (v2): подытог, скидка (с инпутом), корректировка (с инпутом),
 * итого, оплачено, к оплате. Считается реактивно из строк формы —
 * той же математикой, что легаси-хуки useReceiptTotal и др.
 * Налогов у чека нет (легаси: enableTaxRates={false}).
 */
export function ReceiptFormTotalsV2() {
  const form = useFormContext<ReceiptFormValues>();
  const { isNewMode } = useReceiptFormV2Context();

  const entries = useWatch({ control: form.control, name: 'entries' });
  const discount = useWatch({ control: form.control, name: 'discount' });
  const discountType = useWatch({ control: form.control, name: 'discount_type' });
  const adjustment = useWatch({ control: form.control, name: 'adjustment' });
  const currencyCode = useWatch({ control: form.control, name: 'currency_code' });

  const totals = computeReceiptTotals({
    entries: entries ?? [],
    discount,
    discount_type: discountType,
    adjustment,
  });
  const money = (amount: number) => formatReceiptAmount(amount, currencyCode);

  return (
    <div className="ml-auto w-full max-w-sm divide-y divide-border">
      <TotalRow
        label={intl.get('receipt_form.label.subtotal')}
        value={money(totals.subtotal)}
      />

      {/* ----------- Скидка на чек ----------- */}
      <TotalRow
        label={intl.get('receipt_form.label.discount')}
        value={money(totals.discountAmount)}
        control={
          <span className="flex items-center gap-1">
            <FormField
              control={form.control}
              name="discount"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <Input
                      {...field}
                      value={String(field.value ?? '')}
                      inputMode="decimal"
                      autoComplete="off"
                      className="h-8 w-20 text-right tabular-nums sm:h-8"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="discount_type"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <Select
                    value={String(field.value ?? 'amount')}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 w-20 sm:h-8">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="amount">{currencyCode ?? ''}</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </span>
        }
      />

      {/* ----------- Корректировка ----------- */}
      <TotalRow
        label={intl.get('receipt_form.label.adjustment')}
        value={money(totals.adjustmentAmount)}
        control={
          <FormField
            control={form.control}
            name="adjustment"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Input
                    {...field}
                    value={String(field.value ?? '')}
                    inputMode="decimal"
                    autoComplete="off"
                    className="h-8 w-24 border-dashed text-right tabular-nums sm:h-8"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        }
      />

      {/* ----------- Итого ----------- */}
      <TotalRow
        label={`${intl.get('receipt_form.label.total')} (${currencyCode ?? ''})`}
        value={money(totals.total)}
        bold
      />

      {/* ----------- Оплачено и к оплате (в режиме редактирования) ----------- */}
      {!isNewMode && (
        <>
          <TotalRow
            label={intl.get('receipt_form.label.payment_amount')}
            value={money(totals.paidAmount)}
          />
          <TotalRow
            label={intl.get('receipt_form.label.due_amount')}
            value={money(totals.dueAmount)}
            bold
          />
        </>
      )}
    </div>
  );
}
