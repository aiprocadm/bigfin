import * as React from 'react';

import { cn } from '@/lib/cn';

interface TopbarProps {
  titleSlot?: React.ReactNode;
  searchSlot?: React.ReactNode;
  /**
   * Виджет денег (FIN-006 ТЗ-2). Отдельное место, а не «быстрые действия»:
   * это не действие, а главный факт дня, и стоять он должен рядом с ними,
   * но отличаться.
   */
  moneySlot?: React.ReactNode;
  quickActionsSlot?: React.ReactNode;
  notificationsSlot?: React.ReactNode;
  helpSlot?: React.ReactNode;
  orgSwitcherSlot?: React.ReactNode;
  avatarSlot?: React.ReactNode;
  className?: string;
}

export const Topbar = ({
  titleSlot,
  searchSlot,
  moneySlot,
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
        'flex h-14 items-center gap-2 border-b border-border bg-background px-3 sm:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {titleSlot && (
          <div className="hidden shrink-0 md:block">{titleSlot}</div>
        )}
        {searchSlot && <div className="min-w-0 max-w-md flex-1">{searchSlot}</div>}
      </div>
      <div className="flex items-center gap-1">
        {moneySlot}
        {quickActionsSlot}
        {/* «Помощь» прячем на узких экранах — наименее важная иконка */}
        {helpSlot && <span className="hidden sm:inline-flex">{helpSlot}</span>}
        {notificationsSlot}
        {orgSwitcherSlot}
        {avatarSlot}
      </div>
    </header>
  );
};
