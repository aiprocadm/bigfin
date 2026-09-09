import React from 'react';
import { useFormikContext } from 'formik';
import { ExchangeRateInputGroup } from '@/components';
import { useCurrentOrganization } from '@/hooks/state';
import { useVendorNoteIsForeignCustomer } from './utils';

/**
 * vendor credit note exchange rate input field.
 * @returns {JSX.Element}
 */
export function VendorCreditNoteExchangeRateInputField({
  // Имя поля приходит от места вызова и передаётся полю курса как есть.
  name = 'exchange_rate',
  ...props
}: {
  name?: string;
  [key: string]: any;
}) {
  const currentOrganization = useCurrentOrganization();
  const { values } = useFormikContext<any>();

  const isForeignCustomer = useVendorNoteIsForeignCustomer();

  // Can't continue if the customer is not foreign.
  if (!isForeignCustomer) {
    return null;
  }
  return (
    <ExchangeRateInputGroup
      fromCurrency={values.currency_code}
      toCurrency={currentOrganization.base_currency}
      name={name}
      {...props}
    />
  );
}
