import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Settings } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
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
import { DialogsName } from '@/constants/dialogs';
import { useFeatureCan } from '@/hooks/state';
import type { InvoiceFormValues } from './InvoiceForm.zod';
import { useInvoiceFormV2Context } from './InvoiceFormV2.types';

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

export interface InvoiceFormHeaderV2Props {
  /** Базовая валюта организации (для показа поля курса). */
  baseCurrency: string;
  /** Включена ли автонумерация счетов в настройках. */
  invoiceAutoIncrement: boolean;
  /** Открытие redux-диалога (настройка номера счёта). */
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка формы счёта (v2): клиент, даты, номер, курс, филиал/склад.
 * Карточка-группа по стандарту простоты; ключевое поле (клиент) — крупное.
 */
export function InvoiceFormHeaderV2({
  baseCurrency,
  invoiceAutoIncrement,
  openDialog,
}: InvoiceFormHeaderV2Props) {
  const form = useFormContext<InvoiceFormValues>();
  const { customers, branches, warehouses } = useInvoiceFormV2Context();
  const { featureCan } = useFeatureCan();

  const customerOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (customers ?? []).map((customer) => ({
        value: String(customer.id),
        label: customer.display_name,
      })),
    [customers],
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
  const isForeignCustomer = !!currencyCode && currencyCode !== baseCurrency;

  // Смена клиента меняет и валюту счёта (как в легаси-форме).
  const handleCustomerChange = (value: string) => {
    const previous = String(form.getValues('customer_id') ?? '');
    if (previous === value) return;

    form.setValue('customer_id', value, {
      shouldDirty: true,
      shouldValidate: true,
    });
    const customer = (customers ?? []).find((c) => String(c.id) === value);
    if (customer?.currency_code) {
      form.setValue('currency_code', customer.currency_code);
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
        <CardTitle className="text-base font-semibold">
          {intl.get('invoice_form.section.customer')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* ----------- Клиент ----------- */}
        <FormField
          control={form.control}
          name="customer_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {intl.get('customer_name')}
                <RequiredHint />
              </FormLabel>
              <FormControl>
                <Combobox
                  ref={field.ref}
                  items={customerOptions}
                  value={String(field.value ?? '')}
                  onChange={handleCustomerChange}
                  placeholder={intl.get('select_customer_account')}
                  searchPlaceholder={intl.get('search')}
                  emptyText={intl.get('no_results')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ----------- Курс валюты (иностранный клиент) ----------- */}
        {isForeignCustomer && (
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
            name="invoice_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {intl.get('invoice_date')}
                  <RequiredHint />
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={toPickerDate(field.value)}
                    onChange={(date) => field.onChange(fromPickerDate(date))}
                    placeholder={intl.get('invoice_date')}
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

        {/* ----------- Номер счёта и номер документа ----------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <InvoiceNumberFieldV2
            invoiceAutoIncrement={invoiceAutoIncrement}
            openDialog={openDialog}
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

/**
 * Поле «Номер счёта» с шестерёнкой настройки автонумерации.
 * Поведение blur — как в легаси: при автонумерации ручное изменение
 * открывает диалог подтверждения; без неё пишется в invoice_no_manually.
 */
function InvoiceNumberFieldV2({
  invoiceAutoIncrement,
  openDialog,
}: {
  invoiceAutoIncrement: boolean;
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}) {
  const form = useFormContext<InvoiceFormValues>();
  const invoiceNo = form.watch('invoice_no') ?? '';

  // Локальное значение до blur (аналог asyncControl у легаси-инпута).
  const [localNo, setLocalNo] = React.useState<string>(invoiceNo);
  React.useEffect(() => {
    setLocalNo(invoiceNo);
  }, [invoiceNo]);

  const handleBlur = () => {
    if (invoiceNo !== localNo && invoiceAutoIncrement) {
      openDialog(DialogsName.InvoiceNumberSettings, {
        initialFormValues: {
          onceManualNumber: localNo,
          incrementMode: 'manual-transaction',
        },
      });
    }
    if (!invoiceAutoIncrement) {
      form.setValue('invoice_no', localNo, { shouldDirty: true });
      form.setValue('invoice_no_manually', localNo);
    }
  };

  return (
    <FormField
      control={form.control}
      name="invoice_no"
      render={() => (
        <FormItem>
          <FormLabel>
            {intl.get('invoice_no')}
            <RequiredHint />
          </FormLabel>
          <div className="flex items-start gap-2">
            <FormControl>
              <Input
                value={localNo}
                onChange={(event) => setLocalNo(event.target.value)}
                onBlur={handleBlur}
                autoComplete="off"
              />
            </FormControl>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={intl.get('setting_your_auto_generated_invoice_number')}
              title={intl.get('setting_your_auto_generated_invoice_number')}
              onClick={() => openDialog(DialogsName.InvoiceNumberSettings)}
            >
              <Settings className="h-4 w-4" aria-hidden />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
