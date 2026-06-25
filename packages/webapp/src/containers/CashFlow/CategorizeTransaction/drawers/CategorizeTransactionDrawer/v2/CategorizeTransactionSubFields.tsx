import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { FeatureCan } from '@/components';
import { Features } from '@/constants';
import { useCategorizeTransactionBoot } from '../CategorizeTransactionBoot';
import { resolveSubtypeConfig } from './categorizeTransaction.config';
import { ControlledAccountsSelect } from './ControlledAccountsSelect';
import { ControlledBranchSelect } from './ControlledBranchSelect';
import type { CategorizeTransactionFormValues } from './categorizeTransaction.schema';

export function CategorizeTransactionSubFields() {
  const { control, watch } = useFormContext<CategorizeTransactionFormValues>();
  const { accounts, branches } = useCategorizeTransactionBoot();
  const transactionType = watch('transactionType');

  const config = resolveSubtypeConfig(transactionType);
  if (!config) return null;

  return (
    <>
      <FormField
        control={control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('date')}</FormLabel>
            <FormControl>
              <DatePicker
                value={field.value ? new Date(field.value) : undefined}
                onChange={(d) =>
                  field.onChange(d ? moment(d).format('YYYY-MM-DD') : '')
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex gap-3">
        <FormField
          control={control}
          name="debitAccountId"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{intl.get(config.debitAccountLabelKey)}</FormLabel>
              <FormControl>
                <ControlledAccountsSelect
                  items={accounts ?? []}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  disabled
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="creditAccountId"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{intl.get(config.creditAccountLabelKey)}</FormLabel>
              <FormControl>
                <ControlledAccountsSelect
                  items={accounts ?? []}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  filterByRootTypes={config.creditFilterRootTypes}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="referenceNo"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('reference_no')}</FormLabel>
            <FormControl>
              <Input {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{intl.get('description')}</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ''} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FeatureCan feature={Features.Branches}>
        <FormField
          control={control}
          name="branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{intl.get('branch')}</FormLabel>
              <FormControl>
                <ControlledBranchSelect
                  items={branches ?? []}
                  value={field.value ?? null}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FeatureCan>
    </>
  );
}
