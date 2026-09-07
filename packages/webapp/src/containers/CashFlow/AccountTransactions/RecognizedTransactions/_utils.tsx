import React from 'react';
import intl from 'react-intl-universal';
import clsx from 'classnames';
import { Classes } from '@blueprintjs/core';
import { Group, Icon } from '@/components';
import { getColumnWidth } from '@/utils';
import { useRecognizedTransactionsBoot } from './RecognizedTransactionsTableBoot';

const getReportColWidth = (data: any, accessor: any, headerText: any) => {
  return getColumnWidth(
    data,
    accessor,
    { magicSpacing: 10, minWidth: 100 },
    headerText,
  );
};

const recognizeAccessor = (transaction: any) => {
  return (
    <>
      <span>{transaction.assigned_category_formatted}</span>
      <Icon
        icon={'arrowRight'}
        color={'#8F99A8'}
        iconSize={12}
        style={{ marginLeft: 8, marginRight: 8 }}
      />
      <span>{transaction.assigned_account_name}</span>
    </>
  );
};

/**
 * Retrieve uncategorized transactions columns table.
 */
export function useUncategorizedTransactionsColumns() {
  const { recognizedTransactions: data } = useRecognizedTransactionsBoot();

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
        textOverview: true,
      },
      {
        Header: intl.get('description'),
        accessor: 'description',
        className: clsx(Classes.TEXT_MUTED),        
        textOverview: true,
      },
      {
        Header: intl.get('payee'),
        accessor: 'payee',
        textOverview: true,
      },
      {
        Header: intl.get('banking.col.recognize'),
        accessor: recognizeAccessor,
        textOverview: true,
      },
      {
        Header: intl.get('banking.col.rule'),
        accessor: 'bank_rule_name',
        textOverview: true,
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
