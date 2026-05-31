import * as React from 'react';

import { cn } from '@/lib/cn';

interface DashboardShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const DashboardShell = ({
  sidebar,
  topbar,
  children,
  className,
}: DashboardShellProps) => {
  return (
    <div className={cn('bigfin-ui flex h-screen flex-col', className)}>
      {topbar}
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex h-full shrink-0">{sidebar}</aside>
        <main className="flex-1 overflow-auto bg-surface">{children}</main>
      </div>
    </div>
  );
};
