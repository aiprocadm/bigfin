import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
  FormControl,
  FormDescription,
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
import { ACCOUNT_PARENT_TYPE, ACCOUNT_TYPE } from '@/constants/accountTypes';
import { filterAccountsByQuery, nestedArrayToflatten } from '@/utils';
import { useAccountantFormContext } from './AccountantFormProvider';
import type { AccountantFormValues } from './Accountant.zod';

interface AccountRecord {
  id: number | string;
  name: string;
  account_parent_type?: string;
  account_type?: string;
}

const toOptions = (accounts: AccountRecord[]) =>
  accounts.map((a) => ({ value: String(a.id), label: a.name }));

/**
 * Поля формы настроек бухгалтерии (Accountant).
 */
export default function AccountantForm() {
  const form = useFormContext<AccountantFormValues>();
  const { accounts } = useAccountantFormContext() as {
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
  const paymentOptions = useMemo(
    () =>
      toOptions(
        filterAccountsByQuery(flatten, {
          filterByTypes: [
            ACCOUNT_TYPE.CASH,
            ACCOUNT_TYPE.BANK,
            ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
          ],
        }),
      ),
    [flatten],
  );
  const advanceOptions = useMemo(
    () =>
      toOptions(
        filterAccountsByQuery(flatten, {
          filterByParentTypes: [ACCOUNT_PARENT_TYPE.CURRENT_ASSET],
        }),
      ),
    [flatten],
  );

  const CHECKBOXES = [
    {
      name: 'accounts.accountCodeRequired' as const,
      labelKey: 'make_account_code_required_when_create_a_new_accounts',
    },
    {
      name: 'accounts.accountCodeUnique' as const,
      labelKey: 'should_account_code_be_unique_when_create_a_new_account',
    },
  ];

  const ACCOUNT_FIELDS = [
    {
      name: 'paymentReceives.preferredDepositAccount' as const,
      labelKey: 'deposit_customer_account',
      helpKey:
        'select_a_preferred_account_to_deposit_into_it_after_customer_make_payment',
      options: paymentOptions,
    },
    {
      name: 'billPayments.withdrawalAccount' as const,
      labelKey: 'withdrawal_vendor_account',
      helpKey:
        'select_a_preferred_account_to_deposit_into_it_after_customer_make_payment',
      options: paymentOptions,
    },
    {
      name: 'paymentReceives.preferredAdvanceDeposit' as const,
      labelKey: 'customer_advance_deposit',
      helpKey:
        'select_a_preferred_account_to_deposit_into_it_vendor_advanced_deposits',
      options: advanceOptions,
    },
  ];

  return (
    <div className="flex max-w-md flex-col gap-8">
      {/* ----------- Счета: правила кодов ----------- */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text-primary">
          {intl.get('accounts')}
        </h3>
        {CHECKBOXES.map(({ name, labelKey }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal leading-tight">
                  {intl.get(labelKey)}
                </FormLabel>
              </FormItem>
            )}
          />
        ))}
      </div>

      {/* ----------- Метод учёта ----------- */}
      <FormField
        control={form.control}
        name="organization.accountingBasis"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('accounting_basis_')}</FormLabel>
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="cash">{intl.get('cash')}</SelectItem>
                <SelectItem value="accrual">{intl.get('accrual')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* ----------- Предпочтительные счета ----------- */}
      {ACCOUNT_FIELDS.map(({ name, labelKey, helpKey, options }) => (
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
