import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
// Intent — допустимое исключение: используется только для тостов AppToaster.
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxItem } from '@/components/ui/combobox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  withDialogActions,
  type WithDialogActionsProps,
} from '@/containers/Dialog/withDialogActions';
import { useCreateCurrency, useEditCurrency } from '@/hooks/query';
import { currenciesOptions } from '@/utils';
import {
  buildCurrencyFormSchema,
  type CurrencyFormValues,
} from './CurrencyForm.zod';

/** Валюта из справочника (currenciesOptions в utils — легаси без типов). */
interface CurrencyOption {
  currency_code: string;
  formatted_name: string;
  name: string;
  symbol: string;
}

const typedCurrenciesOptions = currenciesOptions as unknown as CurrencyOption[];

/** Запись валюты из payload диалога (строка таблицы валют). */
export interface CurrencyDialogRecord {
  id?: number;
  currency_name?: string;
  currency_code?: string;
  currency_sign?: string;
}

interface CurrencyFormDialogContentV2Props extends WithDialogActionsProps {
  dialogName: string;
  action?: string;
  currency?: CurrencyDialogRecord | string;
}

/**
 * Содержимое диалога валюты: shadcn Form + React Hook Form + Zod.
 * Механизм диалога по имени ('currency-form') остаётся прежним — см. ../index.tsx.
 */
function CurrencyFormDialogContentV2Root({
  dialogName,
  action,
  currency,
  closeDialog,
}: CurrencyFormDialogContentV2Props) {
  const isEditMode = action === 'edit';
  const record: CurrencyDialogRecord | undefined =
    typeof currency === 'object' && currency !== null ? currency : undefined;

  const { mutateAsync: createCurrencyMutate } = useCreateCurrency({});
  const { mutateAsync: editCurrencyMutate } = useEditCurrency({});
  // Легаси-хуки react-query без типов — уточняем сигнатуры точечно.
  const createCurrency = createCurrencyMutate as unknown as (
    values: CurrencyFormValues,
  ) => Promise<unknown>;
  const editCurrency = editCurrencyMutate as unknown as (
    vars: [number, CurrencyFormValues],
  ) => Promise<unknown>;

  const schema = useMemo(() => buildCurrencyFormSchema(), []);

  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency_code: record?.currency_code ?? '',
      currency_name: record?.currency_name ?? '',
      currency_sign: record?.currency_sign ?? '',
    },
  });

  const currencyItems = useMemo<ComboboxItem[]>(
    () =>
      typedCurrenciesOptions.map((option) => ({
        value: option.currency_code,
        label: option.formatted_name,
      })),
    [],
  );

  // При выборе валюты из справочника подставляем название и знак.
  const handleCurrencyCodeChange = (code: string) => {
    form.setValue('currency_code', code, {
      shouldValidate: true,
      shouldDirty: true,
    });
    const option = typedCurrenciesOptions.find(
      (item) => item.currency_code === code,
    );
    if (option) {
      form.setValue('currency_name', option.name, {
        shouldValidate: true,
        shouldDirty: true,
      });
      form.setValue('currency_sign', option.symbol, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  };

  const handleClose = () => {
    closeDialog(dialogName);
  };

  const onSubmit = async (values: CurrencyFormValues) => {
    try {
      if (isEditMode && record?.id != null) {
        await editCurrency([record.id, values]);
      } else {
        await createCurrency(values);
      }
      AppToaster.show({
        message: intl.get(
          isEditMode
            ? 'the_currency_has_been_edited_successfully'
            : 'the_currency_has_been_created_successfully',
        ),
        intent: Intent.SUCCESS,
      });
      closeDialog(dialogName);
    } catch (error) {
      const errors =
        (
          error as {
            response?: { data?: { errors?: Array<{ type: string }> } };
          }
        )?.response?.data?.errors ?? [];

      if (errors.some((e) => e.type === 'CURRENCY_CODE_EXISTS')) {
        AppToaster.show({
          message: intl.get('currency_form.error.code_already_exists'),
          intent: Intent.DANGER,
        });
      }
    }
  };

  return (
    <div className="bigfin-ui rounded-b-md bg-surface p-5">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Валюта из справочника (в режиме редактирования не меняется). */}
          <FormField
            control={form.control}
            name="currency_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('currency_code')}</FormLabel>
                <FormControl>
                  <Combobox
                    items={currencyItems}
                    value={field.value}
                    onChange={handleCurrencyCodeChange}
                    placeholder={intl.get('select_currency_code')}
                    searchPlaceholder={intl.get('search')}
                    emptyText={intl.get('no_results')}
                    disabled={isEditMode}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('currency_name')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency_sign"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('currency_sign')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Одна primary-кнопка на диалог; отмена — ghost. */}
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={form.formState.isSubmitting}
            >
              {intl.get('cancel')}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {intl.get('save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

const CurrencyFormDialogContentV2 = withDialogActions(
  CurrencyFormDialogContentV2Root,
);

export default CurrencyFormDialogContentV2;
