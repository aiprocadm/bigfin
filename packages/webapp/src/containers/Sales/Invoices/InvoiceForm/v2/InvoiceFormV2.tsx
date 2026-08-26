import React, { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { defaultTo, isEmpty, sumBy } from 'lodash';
import { useForm, type Resolver } from 'react-hook-form';
import { useHistory } from 'react-router-dom';

import { AppToaster } from '@/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormField, FormItem } from '@/components/ui/form';
import type { ComboboxItem } from '@/components/ui/combobox';
import {
  LineItemsEditor,
  parseNumericInput,
} from '@/components/ui/line-items-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DialogsName } from '@/constants/dialogs';
import InvoiceNumberDialog from '@/containers/Dialogs/InvoiceNumberDialog';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { withSettings } from '@/containers/Settings/withSettings';
import { useUpdateEffect as useUpdateEffectLoose } from '@/hooks';

// Легаси-хук: дефолт deps=[] выводится как never[] — типизируем локально.
const useUpdateEffect = useUpdateEffectLoose as unknown as (
  effect: () => void,
  deps: unknown[],
) => void;
import { TaxType } from '@/interfaces/TaxRates';
import { compose, orderingLinesIndexes, transactionNumber } from '@/utils';
import {
  defaultInvoice,
  defaultInvoiceEntry,
  transformToEditForm,
  transformValueToRequest,
} from '../utils';
import {
  getInvoiceFormSchema,
  type InvoiceFormValues,
} from './InvoiceForm.zod';
import { InvoiceFormFooterV2 } from './InvoiceFormFooterV2';
import { InvoiceFormHeaderV2 } from './InvoiceFormHeaderV2';
import { InvoiceFormNotesV2 } from './InvoiceFormNotesV2';
import { InvoiceFormTotalsV2 } from './InvoiceFormTotalsV2';
import {
  useInvoiceFormV2Context,
  type ServerErrorsResponse,
} from './InvoiceFormV2.types';
import { resolveDefaultTaxRateId } from '@/utils/russianLegalAttributes/defaultTaxRate';
import {
  applyInvoiceServerErrors,
  normalizeEntriesToForm,
  normalizeValuesToRequest,
} from './InvoiceFormV2.utils';

/** Настройки счетов из redux (легаси withSettings — без типов). */
interface InvoiceSettingsProps {
  invoiceNextNumber?: string | number;
  invoiceNumberPrefix?: string;
  invoiceAutoIncrementMode?: boolean;
  invoiceCustomerNotes?: string;
  invoiceTermsConditions?: string;
}

interface InvoiceFormV2RootProps
  extends InvoiceSettingsProps,
    WithDialogActionsProps {
  // #withCurrentOrganization
  // `tax_regime` — российский налоговый режим организации; по нему продукт
  // сам подставляет ставку НДС (Н2 карты v22). У организаций других стран
  // и у созданных до карты v22 он пуст — тогда ставку выбирает человек.
  organization: { base_currency: string; tax_regime?: string };
}

/** Легаси-диалог номера счёта — ts-nocheck, кастуем сигнатуру локально. */
const InvoiceNumberDialogLoose = InvoiceNumberDialog as unknown as ComponentType<{
  dialogName: string;
  onConfirm: (settings: {
    transactionNumber: string;
    incrementMode: string;
  }) => void;
}>;

/**
 * Форма счёта покупателю (v2): RHF + Zod + shadcn.
 * Данные и мутации — прежний InvoiceFormProvider (react-query);
 * меняется только слой представления.
 */
function InvoiceFormV2Root({
  invoiceNextNumber,
  invoiceNumberPrefix,
  invoiceAutoIncrementMode,
  invoiceCustomerNotes,
  invoiceTermsConditions,
  organization: { base_currency, tax_regime },
  openDialog,
}: InvoiceFormV2RootProps) {
  const history = useHistory();
  const {
    invoice,
    items,
    taxRates,
    branches,
    warehouses,
    newInvoice,
    estimateId,
    isNewMode,
    isBranchesSuccess,
    isWarehousesSuccess,
    saleInvoiceState,
    createInvoiceMutate,
    editInvoiceMutate,
  } = useInvoiceFormV2Context();

  // Н2 карты v22: ставку НДС подставляет продукт — он знает налоговый режим
  // организации. Предприниматель на упрощёнке НДС не платит вовсе, и
  // выбирать «Без НДС» руками в каждой строке каждого счёта незачем. Если
  // режим не задан или нужной ставки нет в справочнике, поле остаётся
  // пустым, как раньше, и человек выбирает сам.
  const defaultTaxRateId = React.useMemo(
    () => resolveDefaultTaxRateId(taxRates, tax_regime),
    [taxRates, tax_regime],
  );

  // Начальные значения — та же логика, что в легаси InvoiceForm:
  // редактирование → transformToEditForm; создание → дефолты + настройки.
  const initialValues = React.useMemo<InvoiceFormValues>(() => {
    const base: Record<string, unknown> = !isEmpty(invoice)
      ? (transformToEditForm(invoice) as Record<string, unknown>)
      : {
          ...defaultInvoice,
          ...(invoiceAutoIncrementMode
            ? {
                invoice_no: transactionNumber(
                  invoiceNumberPrefix,
                  invoiceNextNumber,
                ),
              }
            : {}),
          entries: orderingLinesIndexes(
            defaultInvoice.entries.map((entry: Record<string, unknown>) => ({
              ...entry,
              tax_rate_id: entry.tax_rate_id || defaultTaxRateId,
            })),
          ),
          currency_code: base_currency,
          invoice_message: defaultTo(invoiceCustomerNotes, ''),
          terms_conditions: defaultTo(invoiceTermsConditions, ''),
          pdf_template_id: saleInvoiceState?.defaultTemplateId ?? '',
          ...(newInvoice as Record<string, unknown>),
        };
    return {
      ...base,
      customer_id: base.customer_id ? String(base.customer_id) : '',
      entries: normalizeEntriesToForm(
        (base.entries as Array<Record<string, unknown>>) ?? [],
      ),
    } as InvoiceFormValues;
    // Данные загружены до маунта формы (страница ждёт isBootLoading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(getInvoiceFormSchema(), undefined, {
      raw: true,
    }) as unknown as Resolver<InvoiceFormValues>,
    defaultValues: initialValues,
  });

  // Автонумерация: настройки изменились (диалог) → обновить номер в форме.
  useUpdateEffect(() => {
    if (!invoiceAutoIncrementMode) return;
    form.setValue(
      'invoice_no',
      transactionNumber(invoiceNumberPrefix, invoiceNextNumber),
    );
  }, [invoiceNumberPrefix, invoiceNextNumber]);

  // Основной филиал и склад — в новую форму (как легаси-эффекты).
  React.useEffect(() => {
    if (isBranchesSuccess && isNewMode) {
      const primary = (branches ?? []).find((b) => b.primary) ?? branches?.[0];
      if (primary) form.setValue('branch_id', primary.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBranchesSuccess, isNewMode, branches]);

  React.useEffect(() => {
    if (isWarehousesSuccess && isNewMode) {
      const primary =
        (warehouses ?? []).find((w) => w.primary) ?? warehouses?.[0];
      if (primary) form.setValue('warehouse_id', primary.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWarehousesSuccess, isNewMode, warehouses]);

  // Опции строк-позиций.
  const itemOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (items ?? []).map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [items],
  );
  const taxRateOptions = React.useMemo<ComboboxItem[]>(
    () =>
      (taxRates ?? []).map((taxRate) => ({
        value: String(taxRate.id),
        label: `${taxRate.name} [${taxRate.rate}%]`,
      })),
    [taxRates],
  );

  // Выбор товара в строке — автоподстановка цены/описания/налога (как легаси).
  const handleEntryItemChange = (index: number, itemId: string) => {
    const item = (items ?? []).find((i) => String(i.id) === itemId);
    if (!item) return;

    form.setValue(
      `entries.${index}.rate` as const,
      item.sell_price != null ? String(item.sell_price) : '',
    );
    form.setValue(
      `entries.${index}.description` as const,
      item.sell_description ?? '',
    );
    form.setValue(
      `entries.${index}.tax_rate_id` as const,
      item.sell_tax_rate_id != null ? String(item.sell_tax_rate_id) : '',
    );
    if (!form.getValues(`entries.${index}.quantity` as const)) {
      form.setValue(`entries.${index}.quantity` as const, '1');
    }
  };

  // Сохранение: та же цепочка, что легаси handleSubmit.
  const submitWith = (payload: { deliver: boolean; redirect: boolean }) =>
    form.handleSubmit(async (values) => {
      const filledEntries = (values.entries ?? []).filter(
        (entry) => entry.item_id && entry.quantity,
      );
      const totalQuantity = sumBy(filledEntries, (entry) =>
        parseNumericInput(entry.quantity),
      );
      if (totalQuantity === 0) {
        AppToaster.show({
          message: intl.get('quantity_cannot_be_zero_or_empty'),
          intent: Intent.DANGER,
        });
        return;
      }
      const requestForm = {
        ...transformValueToRequest(normalizeValuesToRequest(values)),
        delivered: payload.deliver,
        from_estimate_id: estimateId,
      };
      try {
        if (!isEmpty(invoice)) {
          await editInvoiceMutate([Number(invoice?.id), requestForm]);
        } else {
          await createInvoiceMutate(requestForm);
        }
        AppToaster.show({
          message: intl.get(
            isNewMode
              ? 'the_invoice_has_been_created_successfully'
              : 'the_invoice_has_been_edited_successfully',
            { number: values.invoice_no },
          ),
          intent: Intent.SUCCESS,
        });
        if (payload.redirect) {
          history.push('/invoices');
        }
      } catch (error) {
        const errors = (error as ServerErrorsResponse)?.response?.data?.errors;
        if (errors) {
          applyInvoiceServerErrors(errors, (message) =>
            form.setError('invoice_no', { message }),
          );
        }
      }
    });

  const isDelivered = Boolean(invoice?.is_delivered);
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={submitWith({ deliver: true, redirect: true })}
        className="flex min-h-full flex-1 flex-col"
      >
        <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
          <InvoiceFormHeaderV2
            baseCurrency={base_currency}
            invoiceAutoIncrement={Boolean(invoiceAutoIncrementMode)}
            openDialog={openDialog}
          />

          {/* ----------- Позиции счёта ----------- */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-0 sm:p-5 sm:pb-0">
              <CardTitle className="text-base font-semibold">
                {intl.get('invoice_form.section.items')}
              </CardTitle>

              {/* Суммы указаны: налог включён в цену / сверх цены */}
              <FormField
                control={form.control}
                name="inclusive_exclusive_tax"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <span className="whitespace-nowrap text-sm text-text-secondary">
                      {intl.get('invoice_form.label.amounts_are')}
                    </span>
                    <Select
                      value={field.value ?? TaxType.Inclusive}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="h-8 w-52 sm:h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={TaxType.Inclusive}>
                          {intl.get('invoice_form.option.tax_inclusive')}
                        </SelectItem>
                        <SelectItem value={TaxType.Exclusive}>
                          {intl.get('invoice_form.option.tax_exclusive')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <LineItemsEditor
                name="entries"
                currencyCode={base_currency}
                items={itemOptions}
                showDiscount
                taxRates={taxRateOptions}
                emptyLine={{
                  ...defaultInvoiceEntry,
                  tax_rate_id: defaultTaxRateId,
                }}
                onItemChange={handleEntryItemChange}
              />
              <InvoiceFormTotalsV2 />
            </CardContent>
          </Card>

          <InvoiceFormNotesV2 />
        </div>

        <InvoiceFormFooterV2
          isSubmitting={isSubmitting}
          isDelivered={isDelivered}
          onSaveDraft={() => submitWith({ deliver: false, redirect: true })()}
          onCancel={() => history.goBack()}
        />

        {/* ----------- Диалог настройки номера счёта ----------- */}
        <InvoiceNumberDialogLoose
          dialogName={DialogsName.InvoiceNumberSettings}
          onConfirm={(settings) => {
            // Как в легаси: номер из диалога → в форму; вручную — только
            // если режим не автоматический.
            form.setValue('invoice_no', settings.transactionNumber);
            form.setValue(
              'invoice_no_manually',
              settings.incrementMode !== 'auto' ? settings.transactionNumber : '',
            );
          }}
        />
      </form>
    </Form>
  );
}

export const InvoiceFormV2 = compose(
  withSettings(
    ({ invoiceSettings }: { invoiceSettings?: Record<string, unknown> }) => ({
      invoiceNextNumber: invoiceSettings?.nextNumber,
      invoiceNumberPrefix: invoiceSettings?.numberPrefix,
      invoiceAutoIncrementMode: invoiceSettings?.autoIncrement,
      invoiceCustomerNotes: invoiceSettings?.customerNotes,
      invoiceTermsConditions: invoiceSettings?.termsConditions,
    }),
  ),
  withCurrentOrganization(undefined),
  withDialogActions,
)(InvoiceFormV2Root) as ComponentType<Record<string, never>>;
