import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { EstimateFormValues } from './EstimateForm.zod';

/**
 * Примечания сметы (v2): примечание для клиента и условия.
 * Дефолты полей приходят из настроек смет (как в легаси).
 */
export function EstimateFormNotesV2() {
  const form = useFormContext<EstimateFormValues>();

  return (
    <Card>
      <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
        <CardTitle className="text-base font-semibold">
          {intl.get('estimate_form.section.notes')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {intl.get('estimate_form.label.customer_note')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={3}
                  placeholder={intl.get('estimate_form.customer_note.placeholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="terms_conditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {intl.get('estimate_form.label.terms_conditions')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={3}
                  placeholder={intl.get(
                    'estimate_form.terms_and_conditions.placeholder',
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
