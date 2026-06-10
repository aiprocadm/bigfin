// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useQueryClient } from 'react-query';
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
import { payrollSettingsSchema, PayrollSettingsFormValues } from './schemas';
import { usePayrollSettings } from '@/hooks/query/payroll';
import { useSaveSettings } from '@/hooks/query/settings';
import t from '@/hooks/query/types';

const selectClassName =
  'border-input bg-background h-9 w-full rounded-md border px-3 text-sm';

interface Props {
  onDone: () => void;
  onCancel: () => void;
}

export function PayrollSettingsDialog({ onDone, onCancel }: Props) {
  const queryClient = useQueryClient();
  const { data: settings } = usePayrollSettings();
  const saveSettings = useSaveSettings({});

  const form = useForm<PayrollSettingsFormValues>({
    resolver: zodResolver(payrollSettingsSchema),
    defaultValues: {
      ndflRate: Number(settings?.ndfl_rate ?? 13),
      contribMode: (settings?.contrib_mode as 'standard' | 'msp') ?? 'standard',
      contribRate: Number(settings?.contrib_rate ?? 30),
      mspRate: Number(settings?.msp_rate ?? 15),
      mspThreshold: Number(settings?.msp_threshold ?? 23280),
    },
  });

  const contribMode = form.watch('contribMode');
  const isSubmitting = form.formState.isSubmitting;

  // Re-sync defaults when settings load
  React.useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      form.reset({
        ndflRate: Number(settings.ndfl_rate ?? 13),
        contribMode: (settings.contrib_mode as 'standard' | 'msp') ?? 'standard',
        contribRate: Number(settings.contrib_rate ?? 30),
        mspRate: Number(settings.msp_rate ?? 15),
        mspThreshold: Number(settings.msp_threshold ?? 23280),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const onSubmit = async (values: PayrollSettingsFormValues) => {
    try {
      await saveSettings.mutateAsync({
        options: [
          { group: 'payroll', key: 'ndfl_rate', value: String(values.ndflRate) },
          { group: 'payroll', key: 'contrib_mode', value: values.contribMode },
          { group: 'payroll', key: 'contrib_rate', value: String(values.contribRate) },
          { group: 'payroll', key: 'msp_rate', value: String(values.mspRate) },
          { group: 'payroll', key: 'msp_threshold', value: String(values.mspThreshold) },
        ],
      } as any);
      queryClient.invalidateQueries(t.PAYROLL_SETTINGS);
      toast.success(intl.get('payroll.settings.saved'));
      onDone();
    } catch {
      toast.error(intl.get('payroll.settings.save_error'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{intl.get('payroll.settings.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="ndflRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payroll.settings.ndfl_rate')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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
              name="contribMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payroll.settings.contrib_mode')}
                  </FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    >
                      <option value="standard">
                        {intl.get('payroll.settings.contrib_mode.standard')}
                      </option>
                      <option value="msp">
                        {intl.get('payroll.settings.contrib_mode.msp')}
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contribRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {intl.get('payroll.settings.contrib_rate')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {contribMode === 'msp' && (
              <>
                <FormField
                  control={form.control}
                  name="mspRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {intl.get('payroll.settings.msp_rate')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
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
                  name="mspThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {intl.get('payroll.settings.msp_threshold')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
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
              </>
            )}
            <p className="text-muted-foreground text-xs">
              {intl.get('payroll.settings.hint')}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {intl.get('payroll.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {intl.get('payroll.save')}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
