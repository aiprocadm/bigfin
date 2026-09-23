import { useMemo } from 'react';
import intl from 'react-intl-universal';
import {
  Eye,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Send,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface UserRow {
  id: number;
  email: string;
  full_name?: string;
  role_name?: string;
  active?: boolean;
  is_invite_accepted?: boolean;
  invite_accepted_at?: string | null;
}

export interface UserRowActions {
  onEdit: (row: UserRow) => void;
  onActivate: (row: UserRow) => void;
  onInactivate: (row: UserRow) => void;
  onDelete: (row: UserRow) => void;
  onResendInvitation: (row: UserRow) => void;
  /** Посмотреть, что видит этот пользователь (FT-081 ТЗ-3). */
  onPreviewAccess?: (row: UserRow) => void;
}

/**
 * Инициалы пользователя для аватара (имя — для принявших приглашение,
 * иначе email).
 */
function userInitials(user: UserRow): string {
  const source =
    user.is_invite_accepted && user.full_name ? user.full_name : user.email;
  return source
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

/**
 * Аватар-кружок с инициалами.
 */
function UserAvatar({ user }: { user: UserRow }) {
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated text-xs font-semibold text-text-secondary"
    >
      {userInitials(user)}
    </span>
  );
}

/**
 * Статус пользователя — пилюля (Badge).
 */
export function UserStatusBadge({ user }: { user: UserRow }) {
  if (!user.is_invite_accepted) {
    return (
      <Badge variant="secondary">
        {intl.get('preferences.users.status.invited')}
      </Badge>
    );
  }
  return user.active ? (
    <Badge variant="success">
      {intl.get('preferences.users.status.active')}
    </Badge>
  ) : (
    <Badge variant="outline">
      {intl.get('preferences.users.status.inactive')}
    </Badge>
  );
}

/**
 * Меню действий строки пользователя (shadcn DropdownMenu).
 */
export function UserActionsMenu({
  row,
  actions,
}: {
  row: UserRow;
  actions: UserRowActions;
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
        {row.invite_accepted_at ? (
          <>
            <DropdownMenuItem onClick={() => actions.onEdit(row)}>
              <Pencil className="mr-2 h-4 w-4" aria-hidden />
              {intl.get('edit_user')}
            </DropdownMenuItem>
            {row.active && actions.onPreviewAccess && (
              <DropdownMenuItem onClick={() => actions.onPreviewAccess?.(row)}>
                <Eye className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('access_preview.start')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {row.active ? (
              <DropdownMenuItem onClick={() => actions.onInactivate(row)}>
                <Pause className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('inactivate_user')}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => actions.onActivate(row)}>
                <Play className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('activate_user')}
              </DropdownMenuItem>
            )}
          </>
        ) : (
          <DropdownMenuItem onClick={() => actions.onResendInvitation(row)}>
            <Send className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('preferences.users.resend_invitation')}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-danger focus:text-danger"
          onClick={() => actions.onDelete(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('delete_user')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Колонки таблицы пользователей для нового DataTable (react-table v7 формат).
 */
export function useUsersTableColumns(actions: UserRowActions) {
  return useMemo(
    () => [
      {
        id: 'avatar',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: UserRow } }) => (
          <UserAvatar user={row.original} />
        ),
      },
      {
        id: 'full_name',
        Header: intl.get('full_name'),
        disableSortBy: true,
        width: 200,
        Cell: ({ row }: { row: { original: UserRow } }) => (
          <span className="font-medium">
            {row.original.is_invite_accepted
              ? row.original.full_name
              : row.original.email}
          </span>
        ),
      },
      {
        id: 'email',
        Header: intl.get('email'),
        accessor: 'email',
        disableSortBy: true,
        width: 200,
      },
      {
        id: 'role_name',
        Header: intl.get('users.column.role_name'),
        accessor: 'role_name',
        disableSortBy: true,
        width: 140,
      },
      {
        id: 'status',
        Header: intl.get('status'),
        disableSortBy: true,
        width: 110,
        Cell: ({ row }: { row: { original: UserRow } }) => (
          <UserStatusBadge user={row.original} />
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: UserRow } }) => (
          <UserActionsMenu row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
