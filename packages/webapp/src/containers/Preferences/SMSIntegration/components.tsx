import { useMemo } from 'react';
import intl from 'react-intl-universal';
import { Bell, BellOff, MoreHorizontal, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SMSNotificationRow {
  key: string;
  notification_label: string;
  notification_description: string;
  module_formatted: string;
  sms_message: string;
  is_notification_enabled: boolean;
}

export interface SMSNotificationRowActions {
  onEditMessageText: (row: SMSNotificationRow) => void;
  onEnableNotification: (row: SMSNotificationRow) => void;
  onDisableNotification: (row: SMSNotificationRow) => void;
  onToggleNotification: (row: SMSNotificationRow, value: boolean) => void;
}

/**
 * Меню действий строки SMS-уведомления (shadcn DropdownMenu).
 */
export function SMSNotificationActionsMenu({
  row,
  actions,
}: {
  row: SMSNotificationRow;
  actions: SMSNotificationRowActions;
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
        <DropdownMenuItem onClick={() => actions.onEditMessageText(row)}>
          <Pencil className="mr-2 h-4 w-4" aria-hidden />
          {intl.get('sms_notifications.edit_message_text')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!row.is_notification_enabled ? (
          <DropdownMenuItem onClick={() => actions.onEnableNotification(row)}>
            <Bell className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('sms_notifications.enable_notification')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => actions.onDisableNotification(row)}>
            <BellOff className="mr-2 h-4 w-4" aria-hidden />
            {intl.get('sms_notifications.disable_notification')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Колонки таблицы SMS-уведомлений для нового DataTable (react-table v7 формат).
 */
export function useSMSIntegrationTableColumns(
  actions: SMSNotificationRowActions,
) {
  return useMemo(
    () => [
      {
        id: 'notification',
        Header: intl.get('sms_messages.column.notification'),
        accessor: 'notification_label',
        disableSortBy: true,
        width: 200,
        Cell: ({ row }: { row: { original: SMSNotificationRow } }) => (
          <div>
            <div className="font-medium">{row.original.notification_label}</div>
            <div className="mt-1 text-xs text-text-secondary">
              {row.original.notification_description}
            </div>
          </div>
        ),
      },
      {
        id: 'service',
        Header: intl.get('sms_messages.column.service'),
        accessor: 'module_formatted',
        disableSortBy: true,
        width: 120,
      },
      {
        id: 'sms_message',
        Header: intl.get('sms_messages.column.message'),
        accessor: 'sms_message',
        disableSortBy: true,
        width: 280,
        Cell: ({ row }: { row: { original: SMSNotificationRow } }) => (
          <div className="max-w-md">
            <div className="whitespace-pre-line rounded-md border border-dashed border-border bg-surface-elevated px-3 py-2 text-sm leading-relaxed text-text-secondary">
              {row.original.sms_message}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1"
              onClick={() => actions.onEditMessageText(row.original)}
            >
              {intl.get('sms_messages.label_edit_message')}
            </Button>
          </div>
        ),
      },
      {
        id: 'is_notification_enabled',
        Header: intl.get('sms_messages.column.auto'),
        accessor: 'is_notification_enabled',
        disableSortBy: true,
        width: 80,
        Cell: ({ row }: { row: { original: SMSNotificationRow } }) => (
          <Switch
            aria-label={intl.get('sms_messages.column.auto')}
            checked={!!row.original.is_notification_enabled}
            onCheckedChange={(value) =>
              actions.onToggleNotification(row.original, value)
            }
          />
        ),
      },
      {
        id: '__actions__',
        Header: '',
        disableSortBy: true,
        width: 48,
        Cell: ({ row }: { row: { original: SMSNotificationRow } }) => (
          <SMSNotificationActionsMenu row={row.original} actions={actions} />
        ),
      },
    ],
    [actions],
  );
}
