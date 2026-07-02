import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { FileText } from 'lucide-react';

import { Money } from '@/components';
import {
  VendorsActionsMenuV2,
  type VendorRow,
  type VendorRowActions,
} from './VendorsActionsMenuV2';

/** Инициалы для аватара-плитки (первые буквы двух первых слов). */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();

/**
 * Колонки таблицы поставщиков для нового DataTable (react-table v7 формат).
 */
export function useVendorsTableColumnsV2(actions: VendorRowActions) {
  return useMemo(
    () => [
      {
        id: 'display_name',
        Header: intl.get('display_name'),
        accessor: 'display_name',
        width: 220,
        Cell: ({ row }: { row: { original: VendorRow } }) => (
          <span className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-[11px] font-semibold text-text-secondary">
              {initials(row.original.display_name ?? '')}
            </span>
            <span className="truncate font-medium">
              {row.original.display_name}
            </span>
          </span>
        ),
      },
      {
        id: 'company_name',
        Header: intl.get('company_name'),
        accessor: 'company_name',
        width: 180,
        Cell: ({ row }: { row: { original: VendorRow } }) => (
          <span className="text-text-secondary">
            {row.original.company_name}
          </span>
        ),
      },
      {
        id: 'work_phone',
        Header: intl.get('phone_number'),
        disableSortBy: true,
        width: 130,
        Cell: ({ row }: { row: { original: VendorRow } }) => (
          <span className="text-text-secondary">{row.original.work_phone}</span>
        ),
      },
      {
        id: 'note',
        Header: intl.get('note'),
        disableSortBy: true,
        width: 60,
        Cell: ({ row }: { row: { original: VendorRow } }) =>
          row.original.note ? (
            <span title={row.original.note} className="text-text-muted">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
          ) : null,
      },
      {
        id: 'balance',
        Header: intl.get('receivable_balance'),
        align: 'right',
        width: 130,
        Cell: ({ row }: { row: { original: VendorRow } }) => (
          <Money
            amount={row.original.closing_balance}
            currency={row.original.currency_code}
          />
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: VendorRow } }) => (
          <VendorsActionsMenuV2 row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
