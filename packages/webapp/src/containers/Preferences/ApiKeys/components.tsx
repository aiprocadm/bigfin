import { useMemo, type ComponentType } from 'react';
import intl from 'react-intl-universal';
import { MoreHorizontal, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FormatDate } from '@/components/Utils/FormatDate';

export interface ApiKeyRow {
  id: number;
  name?: string | null;
  token?: string | null;
  createdAt?: string;
}

export interface ApiKeyRowActions {
  onRevoke: (row: ApiKeyRow) => void;
}

// Легаси-компонент без типов — кастуем локально.
const FormatDateTyped = FormatDate as unknown as ComponentType<{
  value?: string;
}>;

/**
 * Меню действий строки API-ключа (shadcn DropdownMenu).
 */
export function ApiKeyActionsMenu({
  row,
  actions,
}: {
  row: ApiKeyRow;
  actions: ApiKeyRowActions;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={intl.get('more_actions')}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={() => actions.onRevoke(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('api_key.revoke')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Колонки таблицы API-ключей для нового DataTable (react-table v7 формат).
 */
export function useApiKeysTableColumns(actions: ApiKeyRowActions) {
  return useMemo(
    () => [
      {
        id: 'name',
        Header: intl.get('api_key.name'),
        disableSortBy: true,
        width: 200,
        Cell: ({ row }: { row: { original: ApiKeyRow } }) =>
          row.original.name ? (
            <span className="font-medium">{row.original.name}</span>
          ) : (
            <span className="text-text-muted">
              {intl.get('api_key.unnamed')}
            </span>
          ),
      },
      {
        id: 'token',
        Header: intl.get('api_key.token'),
        disableSortBy: true,
        width: 160,
        Cell: ({ row }: { row: { original: ApiKeyRow } }) => (
          <Badge variant="secondary" className="font-mono font-normal">
            {row.original.token || ''}
          </Badge>
        ),
      },
      {
        id: 'permissions',
        Header: intl.get('api_key.permissions'),
        disableSortBy: true,
        width: 150,
        Cell: () => (
          <Badge variant="outline">{intl.get('api_key.full_access')}</Badge>
        ),
      },
      {
        id: 'last_used',
        Header: intl.get('api_key.last_used'),
        disableSortBy: true,
        width: 120,
        // Дата последнего использования пока не отслеживается на сервере.
        Cell: () => (
          <span className="text-text-muted">{intl.get('api_key.never')}</span>
        ),
      },
      {
        id: 'created_at',
        Header: intl.get('api_key.generated_at'),
        disableSortBy: true,
        width: 150,
        Cell: ({ row }: { row: { original: ApiKeyRow } }) => (
          <FormatDateTyped value={row.original.createdAt} />
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: ApiKeyRow } }) => (
          <ApiKeyActionsMenu row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
