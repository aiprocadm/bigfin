// © 2026 Bigfin
import React from 'react';
import { Menu, MenuItem, MenuDivider } from '@blueprintjs/core';
import intl from 'react-intl-universal';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/query/notifications';

export function NotificationsList() {
  const { data: notifications = [] } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllNotificationsRead();

  if (!notifications.length) {
    return (
      <Menu>
        <MenuItem disabled text={intl.get('notifications.inapp.empty')} />
      </Menu>
    );
  }

  return (
    <Menu style={{ maxWidth: 360 }}>
      <MenuItem
        text={intl.get('notifications.inapp.mark_all_read')}
        onClick={() => markAllRead()}
      />
      <MenuDivider />
      {notifications.map((n: any) => (
        <MenuItem
          key={n.id}
          text={
            <div>
              <strong>{n.title}</strong>
              <div style={{ opacity: 0.7, fontSize: 12 }}>{n.body}</div>
            </div>
          }
          labelElement={
            !n.read ? <span style={{ color: '#f5a623' }}>●</span> : undefined
          }
          onClick={() => markRead(n.id)}
        />
      ))}
    </Menu>
  );
}
