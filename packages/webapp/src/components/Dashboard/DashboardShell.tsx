import * as React from 'react';
import intl from 'react-intl-universal';
import { Menu } from 'lucide-react';

import { cn } from '@/lib/cn';
import { PageTitleProvider } from '@/components/ui/page-title';

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

/**
 * Каркас приложения (§7 ТЗ-4): боковое меню слева, справа — шапка и тело.
 *
 * ШАПКА ЖИВЁТ ВНУТРИ ПРОКРУТКИ (UI-045-2, R6). Раньше она стояла над
 * прокручиваемым телом, и под неё ничего не уезжало. Теперь она прилипает к
 * верху той же прокрутки, а тело уходит ПОД неё — сквозь «стекло» видно, что
 * страница продолжается. Волосяная линия под шапкой появляется только после
 * прокрутки: пока страница в начале, границы между шапкой и заголовком нет,
 * как в iOS.
 */
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
  const [scrolled, setScrolled] = React.useState(false);

  const openMenu = React.useCallback(() => setMobileOpen(true), []);
  const onScroll = React.useCallback(
    (event: React.UIEvent<HTMLDivElement>) =>
      setScrolled(event.currentTarget.scrollTop > 0),
    [],
  );

  return (
    <PageTitleProvider>
      <div className={cn('bigfin-ui flex h-screen flex-col', className)}>
        {banner}

        <div className="flex flex-1 overflow-hidden">
          {/* Затемнение фона под выехавшим меню — только на мобильном */}
          {mobileOpen && (
            <button
              type="button"
              aria-label={intl.get('shell.close_menu')}
              className="fixed inset-0 z-40 bg-scrim md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}

          {/* Боковое меню: на десктопе — в потоке; на мобильном — выезжает слева
              поверх контента. Тап по меню (например, по пункту) закрывает его. */}
          <aside
            onClick={() => setMobileOpen(false)}
            className={cn(
              'z-50 h-full shrink-0 transition-transform duration-200 ease-standard',
              'fixed inset-y-0 left-0 md:static md:z-auto',
              mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            )}
          >
            {sidebar}
          </aside>

          <div
            data-shell-scroll
            onScroll={onScroll}
            className="relative flex min-w-0 flex-1 flex-col overflow-auto bg-surface"
          >
            {/* Верхняя строка: бургер (только на мобильном) + шапка. «Стекло»
                и учёт «чёлки» телефона сверху.

                Бургер остаётся, хотя внизу есть «Ещё»: привычка тянуться вверх
                левой рукой у части людей сильнее, а стоит он ничего. */}
            <div
              data-scrolled={scrolled || undefined}
              className={cn(
                'glass sticky top-0 z-30 flex shrink-0 items-center border-b pt-[env(safe-area-inset-top)] transition-colors duration-200',
                scrolled ? 'border-border' : 'border-transparent',
              )}
            >
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

            {/* Отступ снизу на телефоне — под нижнюю панель с полосой жеста:
                без него последняя строка списка навсегда прячется под ней.

                Ширина содержимого не больше 1280 точек (UI-045-8): строка
                таблицы на широком мониторе растягивалась на два метра, и
                сумма уезжала от названия так далеко, что глаз терял строку. */}
            <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
              {children}
            </main>
          </div>
        </div>

        {bottomNav?.(openMenu)}
      </div>
    </PageTitleProvider>
  );
};
