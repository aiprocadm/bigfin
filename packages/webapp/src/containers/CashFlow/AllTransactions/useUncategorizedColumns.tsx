import React from 'react';
import intl from 'react-intl-universal';

import { Money } from '@/components/ui/money';
import { signedAmount } from './amountSign';

import { CategorizeInlineCell } from './CategorizeInlineCell';

/**
 * Колонки списка «Ждут разноски» (этап 3 ТЗ).
 *
 * Это ещё не проводки, а строки выписки: статьи у них нет. Колонка «Статья»
 * даёт выбрать её прямо здесь — операция разносится сразу, без окна
 * (приёмка этапа: десять операций подряд без единого модального окна).
 * Если правило разноски дало подсказку, рядом кнопка «Применить».
 */
export function useUncategorizedColumns(accounts: any[] = []) {
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
        id: 'category',
        Header: intl.get('all_transactions.column.category'),
        disableSortBy: true,
        Cell: ({ row }: any) => (
          <CategorizeInlineCell row={row.original} accounts={accounts} />
        ),
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

          // РАСХОД НЕ КРАСНЫЙ: строка выписки — это работа бизнеса, а не
          // авария. Красный в этом продукте значит «проблема».
          return (
            <Money tone={isDeposit ? 'positive' : 'default'}>
              {signedAmount(
                isDeposit
                  ? formatted_deposit_amount
                  : formatted_withdrawal_amount,
                isDeposit,
              )}
            </Money>
          );
        },
      },
    ],
    [accounts],
  );
}
