import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { ReceiptsFormValues } from './PreferencesReceipts.zod';

/**
 * Поля формы настроек чеков (Receipts).
 */
export function PreferencesReceiptsForm() {
  const form = useFormContext<ReceiptsFormValues>();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <FormField
        control={form.control}
        name="receiptMessage"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('pref.receipts.receiptMessage.field')}</FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="termsConditions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {intl.get('pref.receipts.termsConditions.field')}
            </FormLabel>
            <FormControl>
              <Textarea rows={4} {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
