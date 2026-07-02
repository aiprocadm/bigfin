import React, { ComponentType } from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { defaultTo, isEmpty, sumBy } from 'lodash';
import { useForm, type Resolver } from 'react-hook-form';
import { useHistory } from 'react-router-dom';

import { AppToaster } from '@/components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import type { ComboboxItem } from '@/components/ui/combobox';
import {
  LineItemsEditor,
  parseNumericInput,
} from '@/components/ui/line-items-editor';
import ReceiptNumberDialog from '@/containers/Dialogs/ReceiptNumberDialog';
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
import { compose, orderingLinesIndexes, transactionNumber } from '@/utils';
import {
  defaultReceipt,
  defaultReceiptEntry,
  transformToEditForm,
  transformFormValuesToRequest,
} from '../utils';
import {
  getReceiptFormSchema,
  type ReceiptFormValues,
} from './ReceiptForm.zod';
import { ReceiptFormFooterV2 } from './ReceiptFormFooterV2';
import { ReceiptFormHeaderV2 } from './ReceiptFormHeaderV2';
import { ReceiptFormNotesV2 } from './ReceiptFormNotesV2';
import { ReceiptFormTotalsV2 } from './ReceiptFormTotalsV2';
import {
  useReceiptFormV2Context,
  type ServerErrorsResponse,
} from './ReceiptFormV2.types';
import {
  applyReceiptServerErrors,
  normalizeEntriesToForm,
  normalizeValuesToRequest,
} from './ReceiptFormV2.utils';

/** Настройки чеков из redux (легаси withSettings — без типов). */
interface ReceiptSettingsProps {
  receiptNextNumber?: string | number;
  receiptNumberPrefix?: string;
  receiptAutoIncrementMode?: boolean;
  receiptMessage?: string;
  receiptTermsConditions?: string;
  preferredDepositAccount?: string | number;
}

interface ReceiptFormV2RootProps
  extends ReceiptSettingsProps,
    WithDialogActionsProps {
  // #withCurrentOrganization
  organization: { base_currency: string };
}

/** Легаси-диалог номера чека — без типов, кастуем сигнатуру локально. */
const ReceiptNumberDialogLoose = ReceiptNumberDialog as unknown as ComponentType<{
  dialogName: string;
  onConfirm: (settings: {
    transactionNumber: string;
    incrementMode: string;
  }) => void;
}>;

/**
 * Форма чека (v2): RHF + Zod + shadcn.
 * Данные и мутации — прежний ReceiptFormProvider (react-query);
 * меняется только слой представления.
 */
function ReceiptFormV2Root({
  receiptNextNumber,
  receiptNumberPrefix,
  receiptAutoIncrementMode,
  receiptMessage,
  receiptTermsConditions,
  preferredDepositAccount,
  organization: { base_currency },
  openDialog,
}: ReceiptFormV2RootProps) {
  const history = useHistory();
  const {
    receipt,
    items,
    branches,
    warehouses,
    isNewMode,
    isBranchesSuccess,
    isWarehousesSuccess,
    saleReceiptState,
    createReceiptMutate,
    editReceiptMutate,
  } = useReceiptFormV2Context();

  // Начальные значения — та же логика, что в легаси ReceiptForm:
  // редактирование → transformToEditForm; создание → дефолты + настройки.
  const initialValues = React.useMemo<ReceiptFormValues>(() => {
    const base: Record<string, unknown> = !isEmpty(receipt)
      ? (transformToEditForm(receipt) as Record<string, unknown>)
      : {
          ...defaultReceipt,
          ...(receiptAutoIncrementMode
            ? {
                receipt_number: transactionNumber(
                  receiptNumberPrefix,
                  receiptNextNumber,
                ),
              }
            : {}),
          deposit_account_id: defaultTo(preferredDepositAccount, ''),
          entries: orderingLinesIndexes(defaultReceipt.entries),
          currency_code: base_currency,
          receipt_message: defaultTo(receiptMessage, ''),
          terms_conditions: defaultTo(receiptTermsConditions, ''),
          pdf_template_id: saleReceiptState?.defaultTemplateId ?? '',
        };
    return {
      ...base,
      customer_id: base.customer_id ? String(base.customer_id) : '',
      deposit_account_id: base.deposit_account_id
        ? String(base.deposit_account_id)
        : '',
      entries: normalizeEntriesToForm(
        (base.entries as Array<Record<string, unknown>>) ?? [],
      ),
    } as ReceiptFormValues;
    // Данные загружены до маунта формы (страница ждёт isBootLoading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<ReceiptFormValues>({
    resolver: zodResolver(getReceiptFormSchema(), undefined, {
      raw: true,
    }) as unknown as Resolver<ReceiptFormValues>,
    defaultValues: initialValues,
  });

  // Автонумерация: настройки изменились (диалог) → обновить номер в форме.
  useUpdateEffect(() => {
    if (!receiptAutoIncrementMode) return;
    form.setValue(
      'receipt_number',
      transactionNumber(receiptNumberPrefix, receiptNextNumber),
    );
  }, [receiptNumberPrefix, receiptNextNumber]);

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

  // Выбор товара в строке — автоподстановка цены/описания (как легаси).
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
    if (!form.getValues(`entries.${index}.quantity` as const)) {
      form.setValue(`entries.${index}.quantity` as const, '1');
    }
  };

  // Сохранение: та же цепочка, что легаси handleSubmit
  // (close = легаси submitPayload.status).
  const submitWith = (payload: { close: boolean; redirect: boolean }) =>
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
        closed: payload.close,
      };
      try {
        if (!isEmpty(receipt)) {
          await editReceiptMutate([Number(receipt?.id), requestForm]);
        } else {
          await createReceiptMutate(requestForm);
        }
        AppToaster.show({
          message: intl.get(
            isNewMode
              ? 'the_receipt_has_been_created_successfully'
              : 'the_receipt_has_been_edited_successfully',
            { number: values.receipt_number },
          ),
          intent: Intent.SUCCESS,
        });
        if (payload.redirect) {
          history.push('/receipts');
        }
      } catch (error) {
        const errors = (error as ServerErrorsResponse)?.response?.data?.errors;
        if (errors) {
          applyReceiptServerErrors(errors, (message) =>
            form.setError('receipt_number', { message }),
          );
        }
      }
    });

  const isClosed = Boolean(receipt?.is_closed);
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={submitWith({ close: true, redirect: true })}
        className="flex min-h-full flex-1 flex-col"
      >
        <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
          <ReceiptFormHeaderV2
            baseCurrency={base_currency}
            receiptAutoIncrement={Boolean(receiptAutoIncrementMode)}
            openDialog={openDialog}
          />

          {/* ----------- Позиции чека ----------- */}
          <Card>
            <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
              <CardTitle className="text-base font-semibold">
                {intl.get('receipt_form.section.items')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <LineItemsEditor
                name="entries"
                items={itemOptions}
                showDiscount
                emptyLine={{ ...defaultReceiptEntry }}
                onItemChange={handleEntryItemChange}
              />
              <ReceiptFormTotalsV2 />
            </CardContent>
          </Card>

          <ReceiptFormNotesV2 />
        </div>

        <ReceiptFormFooterV2
          isSubmitting={isSubmitting}
          isClosed={isClosed}
          onSaveDraft={() => submitWith({ close: false, redirect: true })()}
          onCancel={() => history.goBack()}
        />

        {/* ----------- Диалог настройки номера чека ----------- */}
        <ReceiptNumberDialogLoose
          dialogName={'receipt-number-form'}
          onConfirm={(settings) => {
            // Как в легаси: номер из диалога → в форму; вручную — только
            // если режим не автоматический.
            form.setValue('receipt_number', settings.transactionNumber);
            form.setValue(
              'receipt_number_manually',
              settings.incrementMode !== 'auto' ? settings.transactionNumber : '',
            );
          }}
        />
      </form>
    </Form>
  );
}

export const ReceiptFormV2 = compose(
  withSettings(
    ({ receiptSettings }: { receiptSettings?: Record<string, unknown> }) => ({
      receiptNextNumber: receiptSettings?.nextNumber,
      receiptNumberPrefix: receiptSettings?.numberPrefix,
      receiptAutoIncrementMode: receiptSettings?.autoIncrement,
      receiptMessage: receiptSettings?.receiptMessage,
      receiptTermsConditions: receiptSettings?.termsConditions,
      preferredDepositAccount: receiptSettings?.preferredDepositAccount,
    }),
  ),
  withCurrentOrganization(undefined),
  withDialogActions,
)(ReceiptFormV2Root) as ComponentType<Record<string, never>>;
