// @ts-nocheck
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { getDashboardRoutes } from '@/routes/dashboard';
import DashboardPage from './DashboardPage';
import { useAccountantOnlyExplained } from '@/hooks/state/interfaceMode';
import { AccountantOnly } from '@/components/ui/accountant-only';

/**
 * Dashboard inner route content.
 */
/** Один маршрут раздела: путь, экран и подписи к нему. */
export interface DashboardRoute {
  path: string;
  component: React.ComponentType<any>;
  name?: string;
  pageTitle?: React.ReactNode;
  backLink?: boolean;
  hint?: React.ReactNode;
  sidebarExpand?: boolean;
  pageType?: string;
  defaultSearchResource?: string;
  /**
   * Требовать точного совпадения адреса. Ни один из ста одиннадцати маршрутов
   * его сегодня не задаёт, но экран его читает (Д11 карты v76).
   */
  exact?: boolean;
  breadcrumb?: React.ReactNode;
  [key: string]: any;
}

function DashboardContentRouteContent({ route }: { route: DashboardRoute }) {
  return (
    <DashboardPage
      name={route.name}
      Component={route.component}
      pageTitle={route.pageTitle}
      backLink={route.backLink}
      hint={route.hint}
      sidebarExpand={route.sidebarExpand}
      pageType={route.pageType}
      defaultSearchResource={route.defaultSearchResource}
    />
  );
}

/**
 * Dashboard content route.
 */
export default function DashboardContentRoute() {
  // Р2 карты v40. Экран, скрытый режимом «Бизнес», объясняет себя вместо
  // молчаливой подмены адреса на главную: адрес остаётся, человек видит
  // причину и дорогу к настройке режима.
  const accountantOnlyExplained = useAccountantOnlyExplained();
  const routes = getDashboardRoutes();

  if (accountantOnlyExplained) {
    return <AccountantOnly />;
  }

  // Было `<Route pathname="/">` — свойства с таким именем у маршрута нет
  // (Д10 карты v76). Путь «/» и есть то, что имелось в виду.
  return (
    <Route path="/">
      <Switch>
        {routes.map((route, index) => (
          <Route exact={route.exact} key={index} path={`${route.path}`}>
            <DashboardContentRouteContent route={route} />
          </Route>
        ))}
      </Switch>
    </Route>
  );
}
