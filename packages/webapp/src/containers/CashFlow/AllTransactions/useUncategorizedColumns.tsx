import React from 'react';
import intl from 'react-intl-universal';

/**
 * Колонки списка «Ждут разноски» (этап 3 ТЗ).
 *
 * Это ещё не проводки, а строки выписки: у них нет статьи, поэтому вместо
 * неё показывается подсказка от правила разноски — сервер кладёт её в
 * `assigned_account_name`, когда правило сработало. Саму разноску одним
 * движением делает следующий шаг.
 */
export function useUncategorizedColumns() {
  return React.useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: 'formatted_date',
      },
      {
        id: 'payee',
        Header: intl.get('contact'),
        accessor: 'payee',
        disableSortBy: true,
      },
      {
        id: 'description',
        Header: intl.get('all_transactions.column.note'),
        accessor: 'description',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <span
            className="block max-w-[320px] truncate"
            title={row.original.description || ''}
          >
            {row.original.description || '—'}
          </span>
        ),
      },
      {
        id: 'suggestion',
        Header: intl.get('all_transactions.column.category'),
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const suggested = row.original.assigned_account_name;

          return suggested ? (
            <span className="text-text-secondary">
              {intl.get('all_transactions.suggested', { name: suggested })}
            </span>
          ) : (
            <span className="text-text-muted">
              {intl.get('all_transactions.no_category')}
            </span>
          );
        },
      },
      {
        id: 'account',
        Header: intl.get('all_transactions.column.account'),
        accessor: 'account.name',
        disableSortBy: true,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const {
            deposit,
            formatted_deposit_amount,
            formatted_withdrawal_amount,
          } = row.original;
          const isDeposit = Number(deposit) > 0;

          return (
            <span
              className={
                isDeposit
                  ? 'font-medium text-success tabular-nums'
                  : 'text-danger tabular-nums'
              }
            >
              {isDeposit
                ? formatted_deposit_amount
                : formatted_withdrawal_amount}
            </span>
          );
        },
      },
    ],
    [],
  );
}
