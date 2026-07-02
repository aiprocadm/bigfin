import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { BillFormValues } from './BillForm.zod';

/**
 * Примечание счёта поставщика (v2): внутренняя заметка,
 * поставщик её не видит (как подсказывает плейсхолдер легаси).
 */
export function BillFormNotesV2() {
  const form = useFormContext<BillFormValues>();

  return (
    <Card>
      <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
        <CardTitle className="text-base font-semibold">
          {intl.get('bill_form.label.note')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value ?? ''}
                  rows={3}
                  placeholder={intl.get('bill_form.label.note.placeholder')}
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
