// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { formatOrganizationDate } from '@/utils/organizationDate';
import { Button } from '@/components/ui/button';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/query/notifications';
import { notificationTargetPath } from './notificationTarget';

interface NotificationsListProps {
  /** Зовётся при переходе в раздел — колокольчик закрывает выпадашку. */
  onNavigate?: () => void;
}

/** Содержимое выпадашки колокольчика: последние уведомления + «прочитать все». */
export function NotificationsList({ onNavigate }: NotificationsListProps = {}) {
  const history = useHistory();
  const { data: notifications = [] } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  const handleClick = (n: { id: number; eventType: string }) => {
    markRead(n.id);
    const target = notificationTargetPath(n.eventType);
    if (target) {
      history.push(target);
      onNavigate?.();
    }
  };

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
            onClick={() => handleClick(n)}
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
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    'min-w-0 truncate text-sm',
                    !n.read && 'font-medium',
                  )}
                >
                  {n.title}
                </span>
                {/* Дата срабатывания — по формату организации: без неё не
                    отличить сегодняшнее предупреждение от двухнедельного. */}
                <span className="shrink-0 text-[11px] text-text-muted">
                  {formatOrganizationDate(moment(n.firedAt).toDate())}
                </span>
              </span>
              <span className="block text-xs text-text-muted">{n.body}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
