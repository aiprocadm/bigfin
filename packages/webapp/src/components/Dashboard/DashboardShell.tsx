import * as React from 'react';
import intl from 'react-intl-universal';
import { Menu } from 'lucide-react';

import { cn } from '@/lib/cn';

interface DashboardShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
  /**
   * Нижняя панель телефона. Получает функцию открытия полного меню, потому
   * что кнопка «Ещё» живёт в ней, а состояние меню — здесь.
   */
  bottomNav?: (openMenu: () => void) => React.ReactNode;
  /** Полоса над всем экраном — например, режим проверки доступа (FT-081). */
  banner?: React.ReactNode;
  className?: string;
}

export const DashboardShell = ({
  sidebar,
  topbar,
  children,
  bottomNav,
  banner,
  className,
}: DashboardShellProps) => {
  // Состояние выезжающего меню на мобильном. Это UI-состояние, не бизнес-логика.
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const openMenu = React.useCallback(() => setMobileOpen(true), []);

  return (
    <div className={cn('bigfin-ui flex h-screen flex-col', className)}>
      {banner}
      {/* Верхняя строка: бургер (только на мобильном) + верхняя панель.

          Бургер остаётся, хотя внизу есть «Ещё»: привычка тянуться вверх
          левой рукой у части людей сильнее, а стоит он ничего. */}
      <div className="flex items-center border-b border-border bg-background">
        <button
          type="button"
          aria-label={intl.get('shell.open_menu')}
          aria-expanded={mobileOpen}
          onClick={openMenu}
          className="flex h-14 w-12 shrink-0 items-center justify-center text-text-secondary transition-colors hover:text-text-primary md:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">{topbar}</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Затемнение фона под выехавшим меню — только на мобильном */}
        {mobileOpen && (
          <button
            type="button"
            aria-label={intl.get('shell.close_menu')}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
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

        {/* Отступ снизу на телефоне — под нижнюю панель: без него последняя
            строка списка навсегда прячется под ней. */}
        <main className="flex-1 overflow-auto bg-surface pb-16 md:pb-0">
          {children}
        </main>
      </div>

      {bottomNav?.(openMenu)}
    </div>
  );
};
