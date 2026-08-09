import { useMemo } from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { formattedAmount } from '@/utils';
import {
  InvoicesActionsMenuV2,
  type InvoiceRow,
  type InvoiceRowActions,
} from './InvoicesActionsMenuV2';

/**
 * Статус счёта покупателю — Badge по смыслу (замена легаси InvoiceStatus).
 * danger только для просрочки, success для оплаченных; остальное — спокойные тона.
 * Порядок условий повторяет легаси Choose.
 */
export function InvoiceStatusBadgeV2({ invoice }: { invoice: InvoiceRow }) {
  if (invoice.is_fully_paid && invoice.is_delivered) {
    return <Badge variant="success">{intl.get('paid')}</Badge>;
  }
  // Срок и частичная оплата показываются вместе — как у счетов поставщиков.
  // Раньше ветка «срок через N дней» стояла раньше и обрывала проверку:
  // счёт, оплаченный наполовину, выглядел в списке как неоплаченный вовсе,
  // хотя в карточке честно значился долг.
  if (invoice.is_delivered) {
    return (
      <span className="flex flex-wrap items-center gap-1">
        {invoice.is_overdue ? (
          <Badge variant="destructive">
            {intl.get('overdue_by', { overdue: invoice.overdue_days })}
          </Badge>
        ) : (
          <Badge variant="secondary">
            {intl.get('due_in', { due: invoice.remaining_days })}
          </Badge>
        )}
        {invoice.is_partially_paid && (
          <Badge variant="secondary">
            {intl.get('day_partially_paid', {
              // Сумма берётся уже отформатированной с сервера: местное
              // форматирование печатает «RUB20 000,00» вместо «20 000,00 ₽».
              due:
                invoice.due_amount_formatted ??
                formattedAmount(
                  invoice.due_amount,
                  invoice.currency_code,
                  undefined,
                ),
            })}
          </Badge>
        )}
      </span>
    );
  }
  return <Badge variant="outline">{intl.get('draft')}</Badge>;
}

/**
 * Колонки таблицы счетов покупателям для нового DataTable
 * (react-table v7 формат: {id, Header, accessor?, Cell?, width, align?, disableSortBy}).
 */
export function useInvoicesTableColumnsV2(actions: InvoiceRowActions) {
  return useMemo(
    () => [
      {
        id: 'invoice_date',
        Header: intl.get('invoice_date'),
        accessor: 'invoice_date_formatted',
        width: 110,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.invoice_date_formatted}
          </span>
        ),
      },
      {
        id: 'customer',
        Header: intl.get('customer_name'),
        accessor: 'customer.display_name',
        width: 180,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span className="truncate font-medium">
            {row.original.customer?.display_name}
          </span>
        ),
      },
      {
        id: 'invoice_no',
        Header: intl.get('invoice_no__'),
        accessor: 'invoice_no',
        width: 100,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span className="text-text-secondary">{row.original.invoice_no}</span>
        ),
      },
      {
        id: 'amount',
        Header: intl.get('amount'),
        align: 'right',
        width: 120,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span className="font-medium">{row.original.total_formatted}</span>
        ),
      },
      {
        id: 'status',
        Header: intl.get('status'),
        width: 160,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <InvoiceStatusBadgeV2 invoice={row.original} />
        ),
      },
      {
        id: 'due_date',
        Header: intl.get('due_date'),
        accessor: 'due_date_formatted',
        width: 110,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span className="whitespace-nowrap text-text-secondary">
            {row.original.due_date_formatted}
          </span>
        ),
      },
      {
        id: 'reference_no',
        Header: intl.get('reference_no'),
        accessor: 'reference_no',
        width: 90,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <span className="text-text-secondary">
            {row.original.reference_no}
          </span>
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: InvoiceRow } }) => (
          <InvoicesActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
