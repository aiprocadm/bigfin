import * as React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

/**
 * Поля панелей настроек отчётов «Дебиторка/Кредиторка по срокам»
 * (AR/AP Aging Summary). Ожидаемые имена RHF-полей — те же, что в легаси
 * Formik-формах: asDate, agingDaysBefore, agingPeriods (данные не меняем).
 */

// ---------------------------------------------------------------------------
// Отчёт «на дату»: одна дата вместо периода.
// ---------------------------------------------------------------------------

export function ReportAsDateField() {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name="asDate"
      render={({ field }) => (
        <FormItem className="max-w-xs">
          <FormLabel>{intl.get('as_date')}</FormLabel>
          <FormControl>
            <DatePicker
              value={field.value instanceof Date ? field.value : undefined}
              onChange={(date) => field.onChange(date)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Параметры анализа сроков: дней до начала + количество периодов.
// ---------------------------------------------------------------------------

interface AgingNumberFieldProps {
  name: 'agingDaysBefore' | 'agingPeriods';
  label: React.ReactNode;
  min: number;
  max: number;
}

/** Числовое поле; пустой ввод отдаёт NaN — Zod показывает сообщение диапазона. */
function AgingNumberField({ name, label, min, max }: AgingNumberFieldProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              min={min}
              max={max}
              step={1}
              value={
                typeof field.value === 'number' && Number.isFinite(field.value)
                  ? field.value
                  : ''
              }
              onChange={(event) => {
                const raw = event.target.value;
                field.onChange(raw === '' ? Number.NaN : Number(raw));
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ReportAgingFields() {
  return (
    <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
      <AgingNumberField
        name="agingDaysBefore"
        label={intl.get('aging_before_days')}
        min={1}
        max={500}
      />
      <AgingNumberField
        name="agingPeriods"
        label={intl.get('aging_periods')}
        min={1}
        max={12}
      />
    </div>
  );
}
