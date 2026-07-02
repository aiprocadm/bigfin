import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, type ComboboxItem } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Features } from '@/constants';
import { useFeatureCan } from '@/hooks/state';
import type { BillFormValues } from './BillForm.zod';
import { useBillFormV2Context } from './BillFormV2.types';

/** Дата формы ('YYYY-MM-DD') → Date для DatePicker. */
const toPickerDate = (value: string | undefined): Date | undefined =>
  value ? moment(value, 'YYYY-MM-DD').toDate() : undefined;

/** Date из DatePicker → дата формы ('YYYY-MM-DD'). */
const fromPickerDate = (date: Date | undefined): string =>
  date ? moment(date).format('YYYY-MM-DD') : '';

/** Звёздочка обязательного поля (аналог FieldRequiredHint). */
const RequiredHint = () => (
  <span className="text-danger" aria-hidden="true">
    {' '}
    *
  </span>
);

export interface BillFormHeaderV2Props {
  /** Базовая валюта организации (для показа поля курса). */
  baseCurrency: string;
}

/**
 * Шапка формы счёта поставщика (v2): поставщик, даты, номер, курс,
 * филиал/склад. Карточка-группа по стандарту простоты;
 * ключевое поле (поставщик) — первое и крупное.
 */
export function BillFormHeaderV2({ baseCurrency }: BillFormHeaderV2Props) {
  const form = useFormContext<BillFormValues>();
  const { vendors, branches, warehouses } = useBillFormV2Context();
  const { featureCan } = useFeatureCan();

  const vendorOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (vendors ?? []).map((vendor) => ({
        value: String(vendor.id),
        label: vendor.display_name,
      })),
    [vendors],
  );
  const branchOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (branches ?? []).map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    [branches],
  );
  const warehouseOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (warehouses ?? []).map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name,
      })),
    [warehouses],
  );

  const currencyCode = form.watch('currency_code');
  const isForeignVendor = !!currencyCode && currencyCode !== baseCurrency;

  // Смена поставщика меняет и валюту счёта (как в легаси-форме).
  const handleVendorChange = (value: string) => {
    const previous = String(form.getValues('vendor_id') ?? '');
    if (previous === value) return;

    form.setValue('vendor_id', value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const vendor = (vendors ?? []).find((v) => String(v.id) === value);
    if (vendor?.currency_code) {
      form.setValue('currency_code', vendor.currency_code);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
        <CardTitle className="text-base font-semibold">
          {intl.get('bill_form.section.vendor')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* ----------- Поставщик ----------- */}
        <FormField
          control={form.control}
          name="vendor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {intl.get('vendor_name')}
                <RequiredHint />
              </FormLabel>
              <FormControl>
                <Combobox
                  ref={field.ref}
                  items={vendorOptions}
                  value={String(field.value ?? '')}
                  onChange={handleVendorChange}
                  placeholder={intl.get('select_vender_account')}
                  searchPlaceholder={intl.get('search')}
                  emptyText={intl.get('no_results')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ----------- Курс валюты (иностранный поставщик) ----------- */}
        {isForeignVendor && (
          <FormField
            control={form.control}
            name="exchange_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('exchange_rate')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={String(field.value ?? '')}
                    inputMode="decimal"
                    autoComplete="off"
                    className="max-w-48 text-right tabular-nums"
                  />
                </FormControl>
                <FormDescription>
                  {`1 ${currencyCode} → ${baseCurrency}`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* ----------- Даты ----------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="bill_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {intl.get('bill_date')}
                  <RequiredHint />
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={toPickerDate(field.value)}
                    onChange={(date) => field.onChange(fromPickerDate(date))}
                    placeholder={intl.get('bill_date')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {intl.get('due_date')}
                  <RequiredHint />
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={toPickerDate(field.value)}
                    onChange={(date) => field.onChange(fromPickerDate(date))}
                    placeholder={intl.get('due_date')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ----------- Номер счёта поставщика и номер документа ----------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="bill_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('bill_number')}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reference_no"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('reference')}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ----------- Филиал и склад (по фичам) ----------- */}
        {(featureCan(Features.Branches) || featureCan(Features.Warehouses)) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {featureCan(Features.Branches) && (
              <FormField
                control={form.control}
                name="branch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('branch')}</FormLabel>
                    <FormControl>
                      <Combobox
                        ref={field.ref}
                        items={branchOptions}
                        value={String(field.value ?? '')}
                        onChange={field.onChange}
                        placeholder={intl.get('select_branch')}
                        searchPlaceholder={intl.get('search')}
                        emptyText={intl.get('no_results')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {featureCan(Features.Warehouses) && (
              <FormField
                control={form.control}
                name="warehouse_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{intl.get('warehouse')}</FormLabel>
                    <FormControl>
                      <Combobox
                        ref={field.ref}
                        items={warehouseOptions}
                        value={String(field.value ?? '')}
                        onChange={field.onChange}
                        placeholder={intl.get('select_warehouse')}
                        searchPlaceholder={intl.get('search')}
                        emptyText={intl.get('no_results')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
