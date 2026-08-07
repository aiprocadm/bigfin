// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/query/notifications';

/** Содержимое выпадашки колокольчика: последние уведомления + «прочитать все». */
export function NotificationsList() {
  const { data: notifications = [] } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  if (!notifications.length) {
    return (
      <div className="p-4 text-sm text-text-muted">
        {intl.get('notifications.inapp.empty')}
      </div>
    );
  }

  return (
    <div className="flex max-h-96 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-sm font-medium">
          {intl.get('notifications.settings.title')}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => markAllRead()}
        >
          {intl.get('notifications.inapp.mark_all_read')}
        </Button>
      </div>
      <div className="overflow-y-auto">
        {notifications.map((n: any) => (
          <button
            key={n.id}
            type="button"
            onClick={() => markRead(n.id)}
            className={cn(
              'flex w-full items-start gap-2 border-b border-border px-3 py-2 text-left last:border-b-0',
              'hover:bg-surface-elevated/60',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                n.read ? 'bg-transparent' : 'bg-action',
              )}
            />
            <span className="min-w-0">
              <span
                className={cn(
                  'block truncate text-sm',
                  !n.read && 'font-medium',
                )}
              >
                {n.title}
              </span>
              <span className="block text-xs text-text-muted">{n.body}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
