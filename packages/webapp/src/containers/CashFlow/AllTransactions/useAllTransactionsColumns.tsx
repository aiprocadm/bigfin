import React from 'react';
import intl from 'react-intl-universal';
import { Money } from '@/components/ui/money';
import { TransactionStateBadges } from './TransactionStateBadges';
import { AutoRuleBadge } from './AutoRuleBadge';

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
          <span className="flex max-w-[360px] items-center gap-1.5">
            <span className="truncate" title={row.original.note || ''}>
              {row.original.note || '—'}
            </span>
            {/* Метка операции (FT-025 ТЗ-3). */}
            {row.original.tag && (
              <span className="shrink-0 rounded-full border border-border px-2 text-xs text-text-secondary">
                {row.original.tag}
              </span>
            )}
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
        // СОСТОЯНИЕ СТРОКИ (FIN-003 ТЗ-2). Расчёт и бейджи существовали
        // порознь: сервер состояний не отдавал, таблица их не показывала.
        // Теперь строка говорит, чего от неё ждать, — и это половина того,
        // ради чего реестр вообще открывают.
        id: 'state',
        Header: intl.get('all_transactions.column.state'),
        accessor: 'states',
        disableSortBy: true,
        Cell: ({ row: { original } }: any) => (
          <>
            {/* Бейдж «А»: разнесло автоправило (FT-036 ТЗ-3). */}
            <AutoRuleBadge autoRule={original?.auto_rule ?? original?.autoRule} />
            <TransactionStateBadges states={original?.states ?? []} />
          </>
        ),
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
            <Money tone={isDeposit ? 'positive' : 'default'}>
              {isDeposit ? formatted_deposit : formatted_withdrawal}
            </Money>
          );
        },
      },
    ],
    [],
  );
}
