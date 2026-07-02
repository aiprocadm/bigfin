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
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { useFeatureCan } from '@/hooks/state';
import type { ReceiptFormValues } from './ReceiptForm.zod';
import { useReceiptFormV2Context } from './ReceiptFormV2.types';

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

/** Типы счетов зачисления — как filterByTypes у легаси AccountsSelect. */
const DEPOSIT_ACCOUNT_TYPES: string[] = [
  ACCOUNT_TYPE.CASH,
  ACCOUNT_TYPE.BANK,
  ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
];

export interface ReceiptFormHeaderV2Props {
  /** Базовая валюта организации (для показа поля курса). */
  baseCurrency: string;
  /** Включена ли автонумерация чеков в настройках. */
  receiptAutoIncrement: boolean;
  /** Открытие redux-диалога (настройка номера чека). */
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}

/**
 * Шапка формы чека (v2): клиент, счёт зачисления, дата, номер,
 * курс, проект, филиал/склад. Карточка-группа по стандарту простоты;
 * ключевое поле (клиент) — крупное.
 */
export function ReceiptFormHeaderV2({
  baseCurrency,
  receiptAutoIncrement,
  openDialog,
}: ReceiptFormHeaderV2Props) {
  const form = useFormContext<ReceiptFormValues>();
  const { customers, accounts, projects, branches, warehouses } =
    useReceiptFormV2Context();
  const { featureCan } = useFeatureCan();

  const customerOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (customers ?? []).map((customer) => ({
        value: String(customer.id),
        label: customer.display_name,
      })),
    [customers],
  );
  // Счета зачисления: касса, банк, прочие оборотные активы (как в легаси).
  const depositAccountOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (accounts ?? [])
        .filter((account) =>
          DEPOSIT_ACCOUNT_TYPES.includes(String(account.account_type ?? '')),
        )
        .map((account) => ({
          value: String(account.id),
          label: account.name,
        })),
    [accounts],
  );
  const projectOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (projects ?? []).map((project) => ({
        value: String(project.id),
        label: project.name,
      })),
    [projects],
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

  // Смена клиента меняет и валюту чека (как в легаси-форме).
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
          {intl.get('receipt_form.section.customer')}
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

        {/* ----------- Счёт зачисления и дата ----------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="deposit_account_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {intl.get('deposit_account')}
                  <RequiredHint />
                </FormLabel>
                <FormControl>
                  <Combobox
                    ref={field.ref}
                    items={depositAccountOptions}
                    value={String(field.value ?? '')}
                    onChange={field.onChange}
                    placeholder={intl.get('select_deposit_account')}
                    searchPlaceholder={intl.get('search')}
                    emptyText={intl.get('no_results')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="receipt_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {intl.get('receipt_date')}
                  <RequiredHint />
                </FormLabel>
                <FormControl>
                  <DatePicker
                    value={toPickerDate(field.value)}
                    onChange={(date) => field.onChange(fromPickerDate(date))}
                    placeholder={intl.get('receipt_date')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ----------- Номер чека и номер документа ----------- */}
        <div className="grid gap-4 sm:grid-cols-2">
          <ReceiptNumberFieldV2
            receiptAutoIncrement={receiptAutoIncrement}
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

        {/* ----------- Проект/сделка (по фиче) ----------- */}
        {featureCan(Features.Projects) && (
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('receipt.project_name.label')}</FormLabel>
                <FormControl>
                  <Combobox
                    ref={field.ref}
                    items={projectOptions}
                    value={String(field.value ?? '')}
                    onChange={field.onChange}
                    placeholder={intl.get('select_project')}
                    searchPlaceholder={intl.get('search')}
                    emptyText={intl.get('no_results')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
 * Поле «Чек №» с шестерёнкой настройки автонумерации.
 * Поведение blur — как в легаси: при автонумерации ручное изменение
 * открывает диалог подтверждения; без неё пишется в receipt_number_manually.
 */
function ReceiptNumberFieldV2({
  receiptAutoIncrement,
  openDialog,
}: {
  receiptAutoIncrement: boolean;
  openDialog: (name: string, payload?: Record<string, unknown>) => void;
}) {
  const form = useFormContext<ReceiptFormValues>();
  const receiptNumber = form.watch('receipt_number') ?? '';

  // Локальное значение до blur (аналог asyncControl у легаси-инпута).
  const [localNumber, setLocalNumber] = React.useState<string>(receiptNumber);
  React.useEffect(() => {
    setLocalNumber(receiptNumber);
  }, [receiptNumber]);

  const handleBlur = () => {
    if (receiptNumber !== localNumber && receiptAutoIncrement) {
      openDialog('receipt-number-form', {
        initialFormValues: {
          onceManualNumber: localNumber,
          incrementMode: 'manual-transaction',
        },
      });
    }
    if (!receiptAutoIncrement) {
      form.setValue('receipt_number', localNumber, { shouldDirty: true });
      form.setValue('receipt_number_manually', localNumber);
    }
  };

  return (
    <FormField
      control={form.control}
      name="receipt_number"
      render={() => (
        <FormItem>
          <FormLabel>
            {intl.get('receipt')}
            <RequiredHint />
          </FormLabel>
          <div className="flex items-start gap-2">
            <FormControl>
              <Input
                value={localNumber}
                onChange={(event) => setLocalNumber(event.target.value)}
                onBlur={handleBlur}
                autoComplete="off"
              />
            </FormControl>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={intl.get(
                'setting_your_auto_generated_payment_receive_number',
              )}
              title={intl.get(
                'setting_your_auto_generated_payment_receive_number',
              )}
              onClick={() => openDialog('receipt-number-form')}
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
