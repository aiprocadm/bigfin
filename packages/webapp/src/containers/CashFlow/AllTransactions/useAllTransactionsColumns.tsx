import React from 'react';
import intl from 'react-intl-universal';

/**
 * Колонки списка операций по всем счетам (этап 3 ТЗ).
 *
 * Отличие от таблицы одного счёта: здесь обязательны колонки «Счёт» и
 * «Контрагент» — иначе в строке не видно, откуда деньги и кому платили.
 * Приход и расход разведены цветом, как просит ТЗ.
 */
export function useAllTransactionsColumns() {
  return React.useMemo(
    () => [
      {
        id: 'date',
        Header: intl.get('date'),
        accessor: 'formatted_date',
      },
      {
        id: 'contact',
        Header: intl.get('contact'),
        accessor: 'contact_name',
        disableSortBy: true,
      },
      {
        id: 'note',
        Header: intl.get('all_transactions.column.note'),
        accessor: 'note',
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <span
            className="block max-w-[320px] truncate"
            title={row.original.note || ''}
          >
            {row.original.note || '—'}
          </span>
        ),
      },
      {
        id: 'type',
        Header: intl.get('type'),
        accessor: 'formatted_transaction_type',
        disableSortBy: true,
      },
      {
        id: 'account',
        Header: intl.get('all_transactions.column.account'),
        accessor: 'account_name',
        disableSortBy: true,
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        disableSortBy: true,
        Cell: ({ row }: any) => {
          const { deposit, formatted_deposit, formatted_withdrawal } =
            row.original;
          const isDeposit = Number(deposit) > 0;

          return (
            <span
              className={
                isDeposit
                  ? 'font-medium text-success tabular-nums'
                  : 'text-text-primary tabular-nums'
              }
            >
              {isDeposit ? formatted_deposit : formatted_withdrawal}
            </span>
          );
        },
      },
    ],
    [],
  );
}
