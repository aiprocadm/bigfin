import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Combobox } from '@/components/ui/combobox';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ACCOUNT_PARENT_TYPE, ACCOUNT_TYPE } from '@/constants/accountTypes';
import { filterAccountsByQuery, nestedArrayToflatten } from '@/utils';
import { useItemPreferencesFormContext } from './ItemPreferencesFormProvider';
import type { ItemPreferencesFormValues } from './ItemPreferences.zod';

interface AccountRecord {
  id: number | string;
  name: string;
  account_parent_type?: string;
  account_type?: string;
}

/** Приводит счета к опциям Combobox с той же фильтрацией, что в легаси. */
const toOptions = (accounts: AccountRecord[]) =>
  accounts.map((a) => ({ value: String(a.id), label: a.name }));

/**
 * Поля формы настроек товаров (Items): предпочтительные счета
 * продаж, себестоимости и склада.
 */
export default function ItemPreferencesForm() {
  const form = useFormContext<ItemPreferencesFormValues>();
  const { accounts } = useItemPreferencesFormContext() as {
    accounts: AccountRecord[];
  };

  const search = intl.get('preferences.combobox.search');
  const empty = intl.get('preferences.combobox.empty');
  const placeholder = intl.get('select_payment_account');

  // Та же предобработка, что в легаси AccountsSelect (flatten + фильтры).
  const flatten = useMemo(
    () => nestedArrayToflatten(accounts ?? []),
    [accounts],
  );
  const sellOptions = useMemo(
    () =>
      toOptions(
        filterAccountsByQuery(flatten, {
          filterByParentTypes: [ACCOUNT_PARENT_TYPE.INCOME],
        }),
      ),
    [flatten],
  );
  const costOptions = useMemo(
    () =>
      toOptions(
        filterAccountsByQuery(flatten, {
          filterByParentTypes: [ACCOUNT_PARENT_TYPE.EXPENSE],
        }),
      ),
    [flatten],
  );
  const inventoryOptions = useMemo(
    () =>
      toOptions(
        filterAccountsByQuery(flatten, {
          filterByTypes: [ACCOUNT_TYPE.INVENTORY],
        }),
      ),
    [flatten],
  );

  const FIELDS = [
    {
      name: 'preferred_sell_account' as const,
      labelKey: 'preferred_sell_account',
      helpKey:
        'select_a_preferred_account_to_deposit_into_it_after_customer_make_payment',
      options: sellOptions,
    },
    {
      name: 'preferred_cost_account' as const,
      labelKey: 'preferred_cost_account',
      helpKey:
        'select_a_preferred_account_to_deposit_into_it_after_customer_make_payment',
      options: costOptions,
    },
    {
      name: 'preferred_inventory_account' as const,
      labelKey: 'preferred_inventory_account',
      helpKey:
        'select_a_preferred_account_to_deposit_into_it_vendor_advanced_deposits',
      options: inventoryOptions,
    },
  ];

  return (
    <div className="flex max-w-md flex-col gap-6">
      {FIELDS.map(({ name, labelKey, helpKey, options }) => (
        <FormField
          key={name}
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get(labelKey)}</FormLabel>
              <FormControl>
                <Combobox
                  items={options}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={placeholder}
                  searchPlaceholder={search}
                  emptyText={empty}
                />
              </FormControl>
              <FormDescription>{intl.get(helpKey)}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
