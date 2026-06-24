import * as React from 'react';
import { Menu } from 'lucide-react';

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
  // Состояние выезжающего меню на мобильном. Это UI-состояние, не бизнес-логика.
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className={cn('bigfin-ui flex h-screen flex-col', className)}>
      {/* Верхняя строка: бургер (только на мобильном) + верхняя панель */}
      <div className="flex items-center border-b border-border bg-background">
        <button
          type="button"
          aria-label="Открыть меню"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
          className="flex h-14 w-12 shrink-0 items-center justify-center text-text-secondary transition-colors hover:text-text-primary md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">{topbar}</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Затемнение фона под выехавшим меню — только на мобильном */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Боковое меню: на десктопе — в потоке; на мобильном — выезжает слева
            поверх контента. Тап по меню (например, по пункту) закрывает его. */}
        <aside
          onClick={() => setMobileOpen(false)}
          className={cn(
            'z-50 h-full shrink-0 transition-transform duration-200',
            'fixed inset-y-0 left-0 md:static md:z-auto',
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          )}
        >
          {sidebar}
        </aside>

        <main className="flex-1 overflow-auto bg-surface">{children}</main>
      </div>
    </div>
  );
};
