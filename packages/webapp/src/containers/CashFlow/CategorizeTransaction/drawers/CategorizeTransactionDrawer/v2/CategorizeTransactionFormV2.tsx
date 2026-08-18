import React, { useMemo } from 'react';
import intl from 'react-intl-universal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from 'react-query';
import { Intent } from '@blueprintjs/core';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';
import { AppToaster } from '@/components';
import { ContactSelectField } from '@/components/Contacts/ContactSelectField';
import { getAddMoneyInOptions, getAddMoneyOutOptions } from '@/constants';
import { useCategorizeTransaction, useCreateCustomer, useCreateVendor } from '@/hooks/query';
import { useCurrentOrganization } from '@/hooks/state';
import { useCategorizeTransactionTabsBoot } from '@/containers/CashFlow/CategorizeTransactionAside/CategorizeTransactionTabsBoot';
import { withBankingActions } from '@/containers/CashFlow/withBankingActions';
import { compose } from '@/utils';
import { useCategorizeTransactionBoot } from '../CategorizeTransactionBoot';
import {
  tranformToRequest,
  useCategorizeTransactionFormInitialValues,
} from '../_utils';
import {
  categorizeTransactionSchema,
  type CategorizeTransactionFormValues,
} from './categorizeTransaction.schema';
import { CategorizeTransactionSubFields } from './CategorizeTransactionSubFields';
import { showApiError } from '@/utils/showApiError';

function CategorizeTransactionFormV2Root({ closeMatchingTransactionAside }: any) {
  const { uncategorizedTransactionIds } = useCategorizeTransactionTabsBoot();
  const { autofillCategorizeValues, contacts } = useCategorizeTransactionBoot();
  const { mutateAsync: categorizeTransaction } = useCategorizeTransaction({});
  const queryClient = useQueryClient();
  const organization = useCurrentOrganization() as any;
  const { mutateAsync: createCustomer, isLoading: creatingCustomer } = useCreateCustomer({});
  const { mutateAsync: createVendor, isLoading: creatingVendor } = useCreateVendor({});

  const initialValues = useCategorizeTransactionFormInitialValues();
  const form = useForm<CategorizeTransactionFormValues>({
    resolver: zodResolver(categorizeTransactionSchema),
    defaultValues: initialValues as CategorizeTransactionFormValues,
  });

  const isDeposit = autofillCategorizeValues?.isDepositTransaction;
  const formattedAmount = autofillCategorizeValues?.formattedAmount;
  const payee = autofillCategorizeValues?.payee;
  const payeeInn = autofillCategorizeValues?.payeeInn;
  const suggestedByContact = autofillCategorizeValues?.suggestedByContact;
  const typeOptions = useMemo(
    () => (isDeposit ? getAddMoneyInOptions() : getAddMoneyOutOptions()),
    [isDeposit],
  );

  const contactId = form.watch('contactId');
  const canCreateContact = Boolean(payeeInn && payee && !contactId);

  const handleCreateContact = async () => {
    const baseCurrency = organization?.base_currency;
    if (!baseCurrency) {
      AppToaster.show({ message: intl.get('bank_import.contact_create_failed'), intent: Intent.DANGER });
      return;
    }
    const payload = {
      display_name: payee, currency_code: baseCurrency, inn: payeeInn,
      ...(isDeposit ? { customer_type: 'business' } : {}),
    };
    try {
      const res: any = isDeposit
        ? await createCustomer(payload as any)
        : await createVendor(payload as any);
      await queryClient.invalidateQueries(['CONTACTS', 'AUTO-COMPLETE']);
      const newId = res?.data?.id;
      if (newId) form.setValue('contactId', newId);
      AppToaster.show({ message: intl.get('bank_import.contact_created'), intent: Intent.SUCCESS });
    } catch {
      AppToaster.show({ message: intl.get('bank_import.contact_create_failed'), intent: Intent.DANGER });
    }
  };

  const onSubmit = async (values: CategorizeTransactionFormValues) => {
    const payload = tranformToRequest(values, uncategorizedTransactionIds);
    try {
      await categorizeTransaction(payload);
      AppToaster.show({ message: intl.get('cashflow.notify.transaction_categorized'), intent: Intent.SUCCESS });
      closeMatchingTransactionAside();
    } catch (err: any) {
      const branchRequired = err?.response?.data?.errors?.some(
        (e: any) => e.type === 'BRANCH_ID_REQUIRED',
      );
      if (branchRequired) {
        form.setError('branchId', { message: intl.get('branch') });
      } else {
        showApiError(err);
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-1 flex-col bigfin-ui"
      >
        <div className="flex flex-col gap-4 p-5">
          {/* Сумма — только показ */}
          <div>
            <div className="text-xs uppercase tracking-wide text-text-muted">
              {intl.get('amount')}
            </div>
            <div className={isDeposit ? 'text-xl font-medium text-success' : 'text-xl font-medium text-danger'}>
              {formattedAmount}
            </div>
          </div>

          {/* Категория (тип операции) */}
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('category')}</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={intl.get('category')} />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Контрагент */}
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{intl.get('bank_import.counterparty')}</FormLabel>
                <FormControl>
                  <div className="flex flex-col gap-1">
                    <ContactSelectField
                      contacts={contacts}
                      initialContactId={null}
                      selectedContactId={field.value || null}
                      onContactSelected={(c: any) => field.onChange(c ? c.id : null)}
                      buttonProps={{ fill: true }}
                      popoverFill
                    />
                    {payeeInn && (
                      <span className="text-xs text-text-muted">
                        {intl.get('bank_import.counterparty_inn')}: {payeeInn}
                      </span>
                    )}
                    {suggestedByContact && (
                      <p className="text-xs text-text-muted">
                        {intl.get('bank_import.suggested_by_contact')}
                      </p>
                    )}
                    {canCreateContact && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={creatingCustomer || creatingVendor}
                        onClick={handleCreateContact}
                      >
                        {intl.get('bank_import.create_contact')}
                      </Button>
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <CategorizeTransactionSubFields />
        </div>

        {/* Футер */}
        <div className="mt-auto flex gap-2 border-t border-border p-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner size="sm" />}
            {intl.get('save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={form.formState.isSubmitting}
            onClick={() => closeMatchingTransactionAside()}
          >
            {intl.get('close')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export const CategorizeTransactionFormV2 = compose(withBankingActions)(
  CategorizeTransactionFormV2Root,
);
