import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import {
  ExpensesActionsMenuV2,
  type ExpenseRow,
  type ExpenseRowActions,
} from './ExpensesActionsMenuV2';

/** Название счёта расхода: одна категория — её счёт, несколько — метка. */
function expenseAccountLabel(row: ExpenseRow): string {
  if (row.categories.length === 1) {
    return row.categories[0].expense_account?.name ?? '';
  }
  if (row.categories.length > 1) {
    return intl.get('expense.column.multi_categories');
  }
  return '';
}

/**
 * Колонки таблицы расходов для нового DataTable (react-table v7 формат).
 */
export function useExpensesTableColumnsV2(actions: ExpenseRowActions) {
  return useMemo(
    () => [
      {
        id: 'payment_date',
        Header: intl.get('payment_date'),
        accessor: 'formatted_date',
        width: 130,
      },
      {
        id: 'amount',
        Header: intl.get('full_amount'),
        accessor: 'formatted_amount',
        align: 'right',
        width: 140,
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <span className="font-medium">{row.original.formatted_amount}</span>
        ),
      },
      {
        id: 'payment_account',
        Header: intl.get('payment_account'),
        disableSortBy: true,
        width: 150,
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <span className="text-text-secondary">
            {row.original.payment_account?.name}
          </span>
        ),
      },
      {
        id: 'expense_account',
        Header: intl.get('expense_account'),
        disableSortBy: true,
        width: 160,
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <span>{expenseAccountLabel(row.original)}</span>
        ),
      },
      {
        id: 'published',
        Header: intl.get('publish'),
        disableSortBy: true,
        width: 110,
        Cell: ({ row }: { row: { original: ExpenseRow } }) =>
          row.original.is_published ? (
            <Badge variant="success">{intl.get('published')}</Badge>
          ) : (
            <Badge variant="outline">{intl.get('draft')}</Badge>
          ),
      },
      {
        id: 'description',
        Header: intl.get('description'),
        disableSortBy: true,
        width: 200,
        // Описание печатается ТЕКСТОМ (Д2 карты v30). Раньше здесь стоял
        // значок, а текст показывался подсказкой при наведении — на
        // телефоне наведения нет, и столбец «Описание» не показывал
        // описания вовсе. Длинное усекаем, полное оставляем в подсказке.
        Cell: ({ row }: { row: { original: ExpenseRow } }) =>
          row.original.description ? (
            <span
              title={row.original.description}
              className="block truncate text-text-muted"
            >
              {row.original.description}
            </span>
          ) : null,
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: ExpenseRow } }) => (
          <ExpensesActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
