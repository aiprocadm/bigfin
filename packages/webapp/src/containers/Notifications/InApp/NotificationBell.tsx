// © 2026 Bigfin
import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useFeatureCan } from '@/hooks/state/feature';
import { Features } from '@/constants/features';
import { useUnreadCount } from '@/hooks/query/notifications';
import { NotificationsList } from './NotificationsList';
import intl from 'react-intl-universal';

/**
 * Колокольчик уведомлений в верхней панели (слот notificationsSlot новой
 * Topbar). Приёмка ㉒: прежняя версия жила в списанном после D-редизайна
 * DashboardTopbar и не рендерилась вовсе.
 */
export function NotificationBell() {
  const { featureCan } = useFeatureCan();
  const enabled = featureCan(Features.Notifications);
  const { data } = useUnreadCount({ enabled });
  const count = data?.count ?? 0;
  // Управляемое состояние: переход из уведомления закрывает выпадашку,
  // иначе она остаётся висеть над новым разделом.
  const [open, setOpen] = React.useState(false);

  if (!enabled) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={intl.get('notifications')}
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-action px-1 text-[10px] font-medium leading-none text-white"
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <NotificationsList onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
