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
import EstimateNumberDialog from '@/containers/Dialogs/EstimateNumberDialog';
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
  defaultEstimate,
  defaultEstimateEntry,
  transformToEditForm,
  transfromsFormValuesToRequest,
} from '../utils';
import {
  getEstimateFormSchema,
  type EstimateFormValues,
} from './EstimateForm.zod';
import { EstimateFormFooterV2 } from './EstimateFormFooterV2';
import {
  ESTIMATE_NUMBER_DIALOG_NAME,
  EstimateFormHeaderV2,
} from './EstimateFormHeaderV2';
import { EstimateFormNotesV2 } from './EstimateFormNotesV2';
import { EstimateFormTotalsV2 } from './EstimateFormTotalsV2';
import {
  useEstimateFormV2Context,
  type ServerErrorsResponse,
} from './EstimateFormV2.types';
import {
  applyEstimateServerErrors,
  normalizeEntriesToForm,
  normalizeValuesToRequest,
} from './EstimateFormV2.utils';

/** Настройки смет из redux (легаси withSettings — без типов). */
interface EstimateSettingsProps {
  estimateNextNumber?: string | number;
  estimateNumberPrefix?: string;
  estimateAutoIncrementMode?: boolean;
  estimateCustomerNotes?: string;
  estimateTermsConditions?: string;
}

interface EstimateFormV2RootProps
  extends EstimateSettingsProps,
    WithDialogActionsProps {
  // #withCurrentOrganization
  organization: { base_currency: string };
}

/** Легаси-диалог номера сметы без типов — кастуем сигнатуру локально. */
const EstimateNumberDialogLoose =
  EstimateNumberDialog as unknown as ComponentType<{
    dialogName: string;
    onConfirm: (settings: {
      transactionNumber: string;
      incrementMode: string;
    }) => void;
  }>;

/**
 * Форма сметы (v2): RHF + Zod + shadcn.
 * Данные и мутации — прежний EstimateFormProvider (react-query);
 * меняется только слой представления.
 */
function EstimateFormV2Root({
  estimateNextNumber,
  estimateNumberPrefix,
  estimateAutoIncrementMode,
  estimateCustomerNotes,
  estimateTermsConditions,
  organization: { base_currency },
  openDialog,
}: EstimateFormV2RootProps) {
  const history = useHistory();
  const {
    estimate,
    items,
    branches,
    warehouses,
    isNewMode,
    isBranchesSuccess,
    isWarehousesSuccess,
    saleEstimateState,
    createEstimateMutate,
    editEstimateMutate,
  } = useEstimateFormV2Context();

  // Начальные значения — та же логика, что в легаси EstimateForm:
  // редактирование → transformToEditForm; создание → дефолты + настройки.
  const initialValues = React.useMemo<EstimateFormValues>(() => {
    const base: Record<string, unknown> = !isEmpty(estimate)
      ? (transformToEditForm(estimate) as Record<string, unknown>)
      : {
          ...defaultEstimate,
          ...(estimateAutoIncrementMode
            ? {
                estimate_number: transactionNumber(
                  estimateNumberPrefix,
                  estimateNextNumber,
                ),
              }
            : {}),
          entries: orderingLinesIndexes(defaultEstimate.entries),
          currency_code: base_currency,
          note: defaultTo(estimateCustomerNotes, ''),
          terms_conditions: defaultTo(estimateTermsConditions, ''),
          pdf_template_id: saleEstimateState?.defaultTemplateId ?? '',
        };
    return {
      ...base,
      customer_id: base.customer_id ? String(base.customer_id) : '',
      entries: normalizeEntriesToForm(
        (base.entries as Array<Record<string, unknown>>) ?? [],
      ),
    } as EstimateFormValues;
    // Данные загружены до маунта формы (страница ждёт isBootLoading).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const form = useForm<EstimateFormValues>({
    resolver: zodResolver(getEstimateFormSchema(), undefined, {
      raw: true,
    }) as unknown as Resolver<EstimateFormValues>,
    defaultValues: initialValues,
  });

  // Автонумерация: настройки изменились (диалог) → обновить номер в форме.
  useUpdateEffect(() => {
    if (!estimateAutoIncrementMode) return;
    form.setValue(
      'estimate_number',
      transactionNumber(estimateNumberPrefix, estimateNextNumber),
    );
  }, [estimateNumberPrefix, estimateNextNumber]);

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

  // Сохранение: та же цепочка, что легаси handleFormSubmit.
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
        ...transfromsFormValuesToRequest(normalizeValuesToRequest(values)),
        delivered: payload.deliver,
      };
      try {
        if (!isEmpty(estimate)) {
          await editEstimateMutate([Number(estimate?.id), requestForm]);
        } else {
          await createEstimateMutate(requestForm);
        }
        AppToaster.show({
          message: intl.get(
            isNewMode
              ? 'the_estimate_has_been_created_successfully'
              : 'the_estimate_has_been_edited_successfully',
            { number: values.estimate_number },
          ),
          intent: Intent.SUCCESS,
        });
        if (payload.redirect) {
          history.push('/estimates');
        }
      } catch (error) {
        const errors = (error as ServerErrorsResponse)?.response?.data?.errors;
        if (errors) {
          applyEstimateServerErrors(errors, (message) =>
            form.setError('estimate_number', { message }),
          );
        }
      }
    });

  const isDelivered = Boolean(estimate?.is_delivered);
  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={submitWith({ deliver: true, redirect: true })}
        className="flex min-h-full flex-1 flex-col"
      >
        <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 p-4 sm:p-6">
          <EstimateFormHeaderV2
            baseCurrency={base_currency}
            estimateAutoIncrement={Boolean(estimateAutoIncrementMode)}
            openDialog={openDialog}
          />

          {/* ----------- Позиции сметы ----------- */}
          <Card>
            <CardHeader className="p-4 pb-0 sm:p-5 sm:pb-0">
              <CardTitle className="text-base font-semibold">
                {intl.get('estimate_form.section.items')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <LineItemsEditor
                name="entries"
                currencyCode={base_currency}
                items={itemOptions}
                showDiscount
                emptyLine={{ ...defaultEstimateEntry }}
                onItemChange={handleEntryItemChange}
              />
              <EstimateFormTotalsV2 />
            </CardContent>
          </Card>

          <EstimateFormNotesV2 />
        </div>

        <EstimateFormFooterV2
          isSubmitting={isSubmitting}
          isDelivered={isDelivered}
          onSaveDraft={() => submitWith({ deliver: false, redirect: true })()}
          onCancel={() => history.goBack()}
        />

        {/* ----------- Диалог настройки номера сметы ----------- */}
        <EstimateNumberDialogLoose
          dialogName={ESTIMATE_NUMBER_DIALOG_NAME}
          onConfirm={(settings) => {
            // Как в легаси: номер из диалога → в форму; вручную — только
            // если режим не автоматический.
            form.setValue('estimate_number', settings.transactionNumber);
            form.setValue(
              'estimate_number_manually',
              settings.incrementMode !== 'auto' ? settings.transactionNumber : '',
            );
          }}
        />
      </form>
    </Form>
  );
}

export const EstimateFormV2 = compose(
  withSettings(
    ({ estimatesSettings }: { estimatesSettings?: Record<string, unknown> }) => ({
      estimateNextNumber: estimatesSettings?.nextNumber,
      estimateNumberPrefix: estimatesSettings?.numberPrefix,
      estimateAutoIncrementMode: estimatesSettings?.autoIncrement,
      estimateCustomerNotes: estimatesSettings?.customerNotes,
      estimateTermsConditions: estimatesSettings?.termsConditions,
    }),
  ),
  withCurrentOrganization(undefined),
  withDialogActions,
)(EstimateFormV2Root) as ComponentType<Record<string, never>>;
