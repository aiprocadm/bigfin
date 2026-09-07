import React from 'react';
import intl from 'react-intl-universal';
import { getColumnWidth } from '@/utils';
import { useExcludedTransactionsBoot } from './ExcludedTransactionsTableBoot';
import { CLASSES } from '@/constants';

const getReportColWidth = (data: any, accessor: any, headerText: any) => {
  return getColumnWidth(
    data,
    accessor,
    { magicSpacing: 10, minWidth: 100 },
    headerText,
  );
};

const descriptionAccessor = (transaction: any) => {
  return <span className={CLASSES.TEXT_MUTED}>{transaction.description}</span>;
};

/**
 * Retrieve excluded transactions columns table.
 */
export function useExcludedTransactionsColumns() {
  const { excludedBankTransactions: data } = useExcludedTransactionsBoot();

  const withdrawalWidth = getReportColWidth(
    data,
    'formatted_withdrawal_amount',
    'Withdrawal',
  );
  const depositWidth = getReportColWidth(
    data,
    'formatted_deposit_amount',
    'Deposit',
  );

  return React.useMemo(
    () => [
      {
        Header: intl.get('date'),
        accessor: 'formatted_date',
        width: 110,
      },
      {
        Header: intl.get('description'),
        accessor: descriptionAccessor,
        textOverview: true,
      },
      {
        Header: intl.get('payee'),
        accessor: 'payee',
      },
      {
        Header: intl.get('banking.col.deposit'),
        accessor: 'formatted_deposit_amount',
        align: 'right',
        width: depositWidth,
        money: true
      },
      {
        Header: intl.get('banking.col.withdrawal'),
        accessor: 'formatted_withdrawal_amount',
        align: 'right',
        width: withdrawalWidth,
        money: true
      },
    ],
    [],
  );
}
