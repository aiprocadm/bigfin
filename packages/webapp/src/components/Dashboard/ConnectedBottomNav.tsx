import * as React from 'react';
import intl from 'react-intl-universal';
import { BarChart3, Home, Menu, Plus, Receipt } from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';

import { BottomNav, BottomNavItem } from '@/components/ui/BottomNav';
import { DialogsName } from '@/constants/dialogs';
import { useDialogActions } from '@/hooks/state';

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
  const { openDialog } = useDialogActions();

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
      // Приход — самое частое из быстрого: деньги чаще приходят, чем их
      // записывают уходящими вручную (расходы обычно приезжают выпиской).
      onClick: () => openDialog(DialogsName.MoneyInForm),
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
    <BottomNav
      items={items}
      activeHref={location.pathname}
      onNavigate={(href) => history.push(href)}
      ariaLabel={intl.get('bottom_nav.aria_label')}
    />
  );
};
