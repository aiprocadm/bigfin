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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseDateRangeQuery } from '@/utils';
import {
  dateRangeOptions,
  displayColumnsByOptions,
  filterAccountsOptions,
} from '../constants';

// ---------------------------------------------------------------------------
// Локальные типы опций (модуль constants — легаси без типов).
// ---------------------------------------------------------------------------

interface DateRangeOption {
  value: string;
  label: string;
}

interface DisplayColumnsByOption {
  key: string;
  name: string;
}

export interface ReportFilterOption {
  key: string;
  name: string;
  hint?: string;
}

const dateRangePresets = dateRangeOptions as DateRangeOption[];
const displayColumnsPresets = displayColumnsByOptions as DisplayColumnsByOption[];
const filterAccountsPresets = filterAccountsOptions as ReportFilterOption[];

const parseDateRange = parseDateRangeQuery as unknown as (
  keyword: string,
) => { fromDate: Date; toDate: Date };

/**
 * Общие поля формы настройки отчёта. Ожидаемые имена полей формы (RHF):
 * dateRange, fromDate, toDate, displayColumnsType, filterByOption, basis —
 * те же, что в легаси Formik-формах отчётов (данные не меняем).
 */

// ---------------------------------------------------------------------------
// Период отчёта: пресет + две даты.
// ---------------------------------------------------------------------------

/**
 * Период отчёта: селект пресета («Этот месяц», «Этот год»…) + даты «с»/«по».
 * Выбор пресета проставляет обе даты; ручная правка даты переводит
 * пресет в «Произвольный период».
 */
export function ReportDateRangeFields() {
  const form = useFormContext();

  const handlePresetChange = (value: string) => {
    if (value !== 'custom') {
      const range = parseDateRange(value);

      form.setValue('fromDate', range.fromDate, { shouldValidate: true });
      form.setValue('toDate', range.toDate, { shouldValidate: true });
    }
    form.setValue('dateRange', value);
  };

  return (
    <div className="flex flex-col gap-4">
      <FormField
        control={form.control}
        name="dateRange"
        render={({ field }) => (
          <FormItem className="max-w-xs">
            <FormLabel>{intl.get('report_date_range')}</FormLabel>
            <FormControl>
              <Select
                value={typeof field.value === 'string' ? field.value : 'custom'}
                onValueChange={handlePresetChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateRangePresets.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="fromDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('from_date')}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value instanceof Date ? field.value : undefined}
                  onChange={(date) => {
                    field.onChange(date);
                    form.setValue('dateRange', 'custom');
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="toDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('to_date')}</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value instanceof Date ? field.value : undefined}
                  onChange={(date) => {
                    field.onChange(date);
                    form.setValue('dateRange', 'custom');
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Отображаемые столбцы (итого / по месяцам / по кварталам…).
// ---------------------------------------------------------------------------

export function ReportDisplayColumnsByField() {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name="displayColumnsType"
      render={({ field }) => (
        <FormItem className="max-w-xs">
          <FormLabel>{intl.get('display_report_columns')}</FormLabel>
          <FormControl>
            <Select
              value={typeof field.value === 'string' ? field.value : ''}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayColumnsPresets.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Фильтр строк отчёта (все счета / с операциями / без нулевых).
// ---------------------------------------------------------------------------

interface ReportFilterOptionFieldProps {
  /** Набор опций фильтра; по умолчанию — фильтр счетов. */
  items?: ReportFilterOption[];
  /** Подпись поля; по умолчанию — «Фильтр счетов». */
  label?: React.ReactNode;
}

export function ReportFilterOptionField({
  items = filterAccountsPresets,
  label,
}: ReportFilterOptionFieldProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name="filterByOption"
      render={({ field }) => {
        const selected = items.find((item) => item.key === field.value);

        return (
          <FormItem className="max-w-xs">
            <FormLabel>{label ?? intl.get('filter_accounts')}</FormLabel>
            <FormControl>
              <Select
                value={typeof field.value === 'string' ? field.value : ''}
                onValueChange={field.onChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            {selected?.hint ? (
              <p className="text-sm text-text-muted">{selected.hint}</p>
            ) : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Метод учёта: кассовый / по начислению.
// Рендерится ТОЛЬКО в ОПиУ (за флагом accrual_pnl) — остальные отчёты
// кассовый метод серверно не считают, и селектор там был бы мёртвой ручкой
// (приёмка ㉙ сняла его с Баланса/ДДС/ОСВ/Главной книги).
// ---------------------------------------------------------------------------

export function ReportAccountingBasisField() {
  const form = useFormContext();

  const options = [
    { value: 'cash', label: intl.get('cash') },
    { value: 'accrual', label: intl.get('accrual') },
  ];

  return (
    <FormField
      control={form.control}
      name="basis"
      render={({ field }) => (
        <FormItem className="max-w-xs">
          {/* В ключе accounting_basis двоеточие в конце — убираем для чистой подписи. */}
          <FormLabel>{intl.get('accounting_basis').replace(/:\s*$/, '')}</FormLabel>
          <FormControl>
            <Select
              value={typeof field.value === 'string' ? field.value : ''}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
