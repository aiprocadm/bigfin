// © 2026 Bigfin
import React from 'react';
import { Button, Classes, Position } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
import { Icon } from '@/components';
import { useFeatureCan } from '@/hooks/state/feature';
import { Features } from '@/constants/features';
import { useUnreadCount } from '@/hooks/query/notifications';
import { NotificationsList } from './NotificationsList';

export function NotificationBell() {
  const { featureCan } = useFeatureCan();
  const enabled = featureCan(Features.Notifications);
  const { data } = useUnreadCount({ enabled });
  const count = data?.count ?? 0;

  if (!enabled) {
    return null;
  }

  return (
    <Popover2 content={<NotificationsList />} position={Position.BOTTOM}>
      <Button className={Classes.MINIMAL} icon={<Icon icon={'notification-24'} iconSize={20} />}>
        {count > 0 && (
          <span
            style={{
              marginLeft: 4,
              background: '#f5a623',
              color: '#fff',
              borderRadius: 8,
              padding: '0 5px',
              fontSize: 11,
            }}
          >
            {count}
          </span>
        )}
      </Button>
    </Popover2>
  );
}
