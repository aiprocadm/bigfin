import React from 'react';

import intl from 'react-intl-universal';
import { Intent, Tag } from '@blueprintjs/core';
import { isBlank } from '@/utils';
import { accountTypeLabel } from '@/utils/accountTypeLabel';
import { Link } from 'react-router-dom';
import { accountBalanceText } from '@/utils/accountBalance';

/**
 * Account code accessor.
 */
export const AccountCodeAccessor = (row: any) =>
  !isBlank(row.code) ? (
    <Tag minimal={true} round={true} intent={Intent.NONE}>
      {row.code}
    </Tag>
  ) : null;

/**
 * Balance cell.
 */
export const BalanceCell = ({ cell }: any) => {
  const account = cell.row.original;

  // Счёт без движений — это ноль, а не «неизвестно» (С2 карты v29).
  return (
    <span>
      {accountBalanceText(
        account.amount,
        account.formatted_amount,
        account.currency_code,
      )}
    </span>
  );
};

/**
 * Account cell.
 */
const AccountCell = ({ row }: any) => {
  const account = row.original;
  return (
    <>
      <div>X</div>
      <Link to={`/account/${account.id}/transactions`}>{account.name}</Link>
    </>
  );
};

/**
 * Retrieve Cash flow table columns.
 */
export function useCashFlowAccountsTableColumns() {
  return React.useMemo(
    () => [
      {
        id: 'name',
        Header: intl.get('account_name'),
        accessor: 'name',
        Cell: AccountCell,
        className: 'account_name',
        width: 200,
        textOverview: true,
      },
      {
        id: 'code',
        Header: intl.get('code'),
        accessor: 'code',
        className: 'code',
        width: 80,
      },
      {
        id: 'type',
        Header: intl.get('type'),
        // Подпись типа — из словаря по ключу: сервер отдаёт её
        // по-английски (С1 карты v29).
        accessor: (row: any) =>
          accountTypeLabel(row.account_type, row.account_type_label),
        className: 'type',
        width: 140,
        textOverview: true,
      },
      {
        id: 'currency',
        Header: intl.get('currency'),
        accessor: 'currency_code',
        width: 75,
      },
      {
        id: 'balance',
        Header: intl.get('balance'),
        accessor: 'amount',
        className: 'balance',
        Cell: BalanceCell,
        width: 150,
        align: 'right',
      },
    ],
    [],
  );
}
