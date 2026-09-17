import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { Money, ExchangeRateInputGroup } from '@/components';
import { MoneyFieldCell } from '@/components/DataTableCells';
import { useFormikContext } from 'formik';
import { useCurrentOrganization } from '@/hooks/state';
import { usePaymentMadeIsForeignCustomer } from './utils';

function BillNumberAccessor(row: { bill_no?: string | null }) {
  return row?.bill_no ? row?.bill_no : '-';
}

function BillDateCell({ value }: { value: string }) {
  return moment(value).format('YYYY MMM DD');
}

/**
 * Mobey table cell.
 */
function MoneyTableCell({
  row: { original },
  value,
}: {
  row: { original: { currency_code: string } };
  value: number;
}) {
  return <Money amount={value} currency={original.currency_code} />;
}

/**
 * Payment made entries table columns
 */
export function usePaymentMadeEntriesTableColumns() {
  return React.useMemo(
    () => [
      {
        // Заголовок был английским прямо в коде, хотя ключ `bill_date`
        // есть в обоих словарях (Д7 карты v85).
        Header: intl.get('bill_date'),
        id: 'bill_date',
        accessor: 'bill_date',
        Cell: BillDateCell,
        disableSortBy: true,
        width: 120,
      },
      {
        Header: intl.get('bill_number'),
        accessor: BillNumberAccessor,
        disableSortBy: true,
        width: 120,
      },
      {
        Header: intl.get('bill_amount'),
        accessor: 'amount',
        Cell: MoneyTableCell,
        disableSortBy: true,
        width: 150,
      },
      {
        Header: intl.get('amount_due'),
        accessor: 'due_amount',
        Cell: MoneyTableCell,
        disableSortBy: true,
        width: 150,
      },
      {
        Header: intl.get('payment_amount'),
        accessor: 'payment_amount',
        Cell: MoneyFieldCell,
        disableSortBy: true,
        width: 150,
      },
    ],
    [],
  );
}

/**
 * payment made exchange rate input field.
 * @returns {JSX.Element}
 */
type PaymentMadeExchangeRateInputFieldProps = Omit<
  React.ComponentProps<typeof ExchangeRateInputGroup>,
  'fromCurrency' | 'toCurrency'
>;

export function PaymentMadeExchangeRateInputField(
  props: PaymentMadeExchangeRateInputFieldProps,
) {
  const currentOrganization = useCurrentOrganization();
  const { values } = useFormikContext<any>();

  const isForeignCustomer = usePaymentMadeIsForeignCustomer();

  // Can't continue if the customer is not foreign.
  if (!isForeignCustomer) {
    return null;
  }
  return (
    <ExchangeRateInputGroup
      fromCurrency={values.currency_code}
      toCurrency={currentOrganization.base_currency}
      {...props}
    />
  );
}
