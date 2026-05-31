import * as React from 'react';

import { cn } from '@/lib/cn';

interface TopbarProps {
  searchSlot?: React.ReactNode;
  quickActionsSlot?: React.ReactNode;
  notificationsSlot?: React.ReactNode;
  helpSlot?: React.ReactNode;
  orgSwitcherSlot?: React.ReactNode;
  avatarSlot?: React.ReactNode;
  className?: string;
}

export const Topbar = ({
  searchSlot,
  quickActionsSlot,
  notificationsSlot,
  helpSlot,
  orgSwitcherSlot,
  avatarSlot,
  className,
}: TopbarProps) => {
  return (
    <header
      className={cn(
        'flex h-14 items-center gap-2 border-b border-border bg-background px-4',
        className,
      )}
    >
      <div className="flex flex-1 items-center">
        {searchSlot && <div className="max-w-md flex-1">{searchSlot}</div>}
      </div>
      <div className="flex items-center gap-1">
        {quickActionsSlot}
        {helpSlot}
        {notificationsSlot}
        {orgSwitcherSlot}
        {avatarSlot}
      </div>
    </header>
  );
};
