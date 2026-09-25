import * as React from 'react';
import intl from 'react-intl-universal';
import { BarChart3, Home, Menu, Plus, Receipt } from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';

import { BottomNav, BottomNavItem } from '@/components/ui/BottomNav';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/cn';
import { useAddActions } from './addActions';

interface ConnectedBottomNavProps {
  /** Открыть полное меню разделов. */
  onOpenMenu: () => void;
}

/**
 * Нижняя панель телефона — четыре ежедневных дела и вход в остальное.
 *
 * Состав отвечает на то, зачем владелец открывает продукт с телефона:
 *
 * 1. «Главная» — сколько денег;
 * 2. «Операции» — разнести вчерашнее, ежедневная рутина;
 * 3. «Добавить» — записать приход или расход, пока не забыл;
 * 4. «Отчёты» — посмотреть, как идут дела;
 * 5. «Ещё» — всё остальное, оно нужно реже.
 *
 * Это не полный список разделов и не должно им быть: панель на пять целей —
 * не меню, а быстрые руки.
 */
export const ConnectedBottomNav = ({ onOpenMenu }: ConnectedBottomNavProps) => {
  const history = useHistory();
  const location = useLocation();
  const addActions = useAddActions();
  const [addOpen, setAddOpen] = React.useState(false);

  const items: BottomNavItem[] = [
    {
      key: 'home',
      label: intl.get('sidebar.homepage'),
      icon: Home,
      href: '/',
    },
    {
      key: 'operations',
      label: intl.get('bottom_nav.operations'),
      icon: Receipt,
      href: '/cashflow-accounts/transactions',
    },
    {
      key: 'add',
      label: intl.get('topbar.add'),
      icon: Plus,
      emphasis: true,
      // Шторка «Добавить» (§7 ТЗ-4): тот же список, что у «＋» в шапке.
      // Раньше кнопка сразу открывала приход — расход с телефона записать
      // было нечем, кроме как через меню разделов.
      onClick: () => setAddOpen(true),
    },
    {
      key: 'reports',
      label: intl.get('sidebar.reports'),
      icon: BarChart3,
      href: '/financial-reports',
    },
    {
      key: 'more',
      label: intl.get('bottom_nav.more'),
      icon: Menu,
      onClick: onOpenMenu,
    },
  ];

  return (
    <>
      <BottomNav
        items={items}
        activeHref={location.pathname}
        onNavigate={(href) => history.push(href)}
        ariaLabel={intl.get('bottom_nav.aria_label')}
      />
      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title={intl.get('topbar.add')}
        side="bottom"
      >
        <ul className="-mx-2 flex flex-col">
          {addActions.map((action) => {
            const Icon = action.icon;
            return (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => {
                    setAddOpen(false);
                    action.run();
                  }}
                  className="flex min-h-12 w-full items-center gap-3 rounded-control border-0 bg-transparent px-2 text-left text-body text-text-primary hover:bg-fill-1"
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      action.positive ? 'text-success' : 'text-text-secondary',
                    )}
                    aria-hidden
                  />
                  {action.label}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </>
  );
};
