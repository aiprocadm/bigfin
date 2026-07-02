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
import type { CreditNotesFormValues } from './PreferencesCreditNotes.zod';

/**
 * Поля формы настроек возвратов (Credit Notes).
 */
export function PreferencesCreditNotesForm() {
  const form = useFormContext<CreditNotesFormValues>();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <FormField
        control={form.control}
        name="customerNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {intl.get('pref.creditNotes.customerNotes.field')}
            </FormLabel>
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
              {intl.get('pref.creditNotes.termsConditions.field')}
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
