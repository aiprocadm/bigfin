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
import type { EstimatesFormValues } from './PreferencesEstimates.zod';

/**
 * Поля формы настроек смет (Estimates).
 */
export function PreferencesEstimatesForm() {
  const form = useFormContext<EstimatesFormValues>();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <FormField
        control={form.control}
        name="customerNotes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('pref.estimates.customerNotes.field')}</FormLabel>
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
              {intl.get('pref.estimates.termsConditions.field')}
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
