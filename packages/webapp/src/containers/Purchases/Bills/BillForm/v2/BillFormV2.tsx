import React, { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { isEmpty, sumBy } from 'lodash';
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
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { TaxType } from '@/interfaces/TaxRates';
import { compose } from '@/utils';
import {
  defaultBill,
  defaultBillEntry,
  transformToEditForm,
  transformFormValuesToRequest,
} from '../utils';
import { getBillFormSchema, type BillFormValues } from './BillForm.zod';
import { BillFormFooterV2 } from './BillFormFooterV2';
import { BillFormHeaderV2 } from './BillFormHeaderV2';
import { BillFormNotesV2 } from './BillFormNotesV2';
import { BillFormTotalsV2 } from './BillFormTotalsV2';
import {
  useBillFormV2Context,
  type ServerErrorsResponse,
} from './BillFormV2.types';
import {
  applyBillServerErrors,
  normalizeEntriesToForm,
  normalizeValuesToRequest,
} from './BillFormV2.utils';

interface BillFormV2RootProps {
  // #withCurrentOrganization
  organization: { base_currency: string };
}

/**
 * Форма счёта поставщика (v2): RHF + Zod + shadcn.
 * Данные и мутации — прежний BillFormProvider (react-query);
 * меняется только слой представления.
 */
function BillFormV2Root({
  organization: { base_currency },
}: BillFormV2RootProps) {
  const history = useHistory();
  const {
    bill,
    items,
    taxRates,
    branches,
    warehouses,
    isNewMode,
    isBranchesSuccess,
    isWarehousesSuccess,
    createBillMutate,
    editBillMutate,
  } = useBillFormV2Context();

  // Начальные значения — та же логика, что в легаси BillForm:
  // редактирование → transformToEditForm; создание → дефолты + базовая валюта.
  const initialValues = React.useMemo<BillFormValues>(() => {
    const base: Record<string, unknown> = !isEmpty(bill)
      ? (transformToEditForm(bill) as Record<string, unknown>)
      : {
          ...defaultBill,
          currency_code: base_currency,
        };
    return {
      ...base,
      vendor_id: base.vendor_id ? String(base.vendor_id) : '',
      entries: normalizeEntriesToForm(
        (base.entries as Array<Record<string, unknown>>) ?? [],
      ),
    } as BillFormValues;
    // Данные загружены до маунта формы (страница ждёт isBootLoading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<BillFormValues>({
    resolver: zodResolver(getBillFormSchema(), undefined, {
      raw: true,
    }) as unknown as Resolver<BillFormValues>,
    defaultValues: initialValues,
  });

  // Основной филиал и склад — в новую форму (как легаси-эффекты
  // useSetPrimaryBranchToForm / useSetPrimaryWarehouseToForm).
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

  // Опции строк-позиций (закупаемые товары/услуги).
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

  // Выбор товара в строке — автоподстановка закупочной цены/описания/налога
  // (как легаси ItemsEntriesTable с itemType=PURCHASABLE).
  const handleEntryItemChange = (index: number, itemId: string) => {
    const item = (items ?? []).find((i) => String(i.id) === itemId);
    if (!item) return;

    form.setValue(
      `entries.${index}.rate` as const,
      item.cost_price != null ? String(item.cost_price) : '',
    );
    form.setValue(
      `entries.${index}.description` as const,
      item.purchase_description ?? '',
    );
    form.setValue(
      `entries.${index}.tax_rate_id` as const,
      item.purchase_tax_rate_id != null
        ? String(item.purchase_tax_rate_id)
        : '',
    );
    if (!form.getValues(`entries.${index}.quantity` as const)) {
      form.setValue(`entries.${index}.quantity` as const, '1');
    }
  };

  // Сохранение: та же цепочка, что легаси handleFormSubmit
  // (open = submitPayload.status в легаси).
  const submitWith = (payload: { open: boolean; redirect: boolean }) =>
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
        ...transformFormValuesToRequest(normalizeValuesToRequest(values)),
        open: payload.open,
      };
      try {
        if (!isEmpty(bill)) {
          await editBillMutate([Number(bill?.id), requestForm]);
        } else {
          await createBillMutate(requestForm);
        }
        AppToaster.show({
          message: intl.get(
            isNewMode
              ? 'the_bill_has_been_created_successfully'
              : 'the_bill_has_been_edited_successfully',
          ),
          intent: Intent.SUCCESS,
        });
        if (payload.redirect) {
          history.push('/bills');
        }
      } catch (error) {
        const errors = (error as ServerErrorsResponse)?.response?.data?.errors;
        if (errors) {
          applyBillServerErrors(errors, (message) =>
            form.setError('bill_number', { message }),
          );
        }
      }
    });

  const isOpened = Boolean(bill?.is_open);
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={submitWith({ open: true, redirect: true })}
        className="flex min-h-full flex-1 flex-col"
      >
        <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
          <BillFormHeaderV2 baseCurrency={base_currency} />

          {/* ----------- Позиции счёта поставщика ----------- */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-0 sm:p-5 sm:pb-0">
              <CardTitle className="text-base font-semibold">
                {intl.get('bill_form.section.items')}
              </CardTitle>

              {/* Суммы указаны: налог включён в цену / сверх цены */}
              <FormField
                control={form.control}
                name="inclusive_exclusive_tax"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <span className="whitespace-nowrap text-sm text-text-secondary">
                      {intl.get('amounts_are')}
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
                items={itemOptions}
                showDiscount
                taxRates={taxRateOptions}
                emptyLine={{ ...defaultBillEntry }}
                onItemChange={handleEntryItemChange}
              />
              <BillFormTotalsV2 />
            </CardContent>
          </Card>

          <BillFormNotesV2 />
        </div>

        <BillFormFooterV2
          isSubmitting={isSubmitting}
          isOpened={isOpened}
          onSaveDraft={() => submitWith({ open: false, redirect: true })()}
          onCancel={() => history.goBack()}
        />
      </form>
    </Form>
  );
}

export const BillFormV2 = compose(withCurrentOrganization(undefined))(
  BillFormV2Root,
) as ComponentType<Record<string, never>>;
