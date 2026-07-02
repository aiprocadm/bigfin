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
import type { ReceiptFormValues } from './ReceiptForm.zod';

/**
 * Примечания чека (v2): сообщение клиенту и условия.
 * Дефолты полей приходят из настроек чеков (как в легаси).
 */
export function ReceiptFormNotesV2() {
  const form = useFormContext<ReceiptFormValues>();

  return (
    <Card>
      <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
        <CardTitle className="text-base font-semibold">
          {intl.get('receipt_form.section.notes')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <FormField
          control={form.control}
          name="receipt_message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {intl.get('receipt_form.label.receipt_message')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={3}
                  placeholder={intl.get('receipt_form.receipt_message.placeholder')}
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
                {intl.get('receipt_form.label.terms_conditions')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={3}
                  placeholder={intl.get(
                    'receipt_form.terms_and_conditions.placeholder',
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
