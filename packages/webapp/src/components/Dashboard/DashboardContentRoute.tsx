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
function DashboardContentRouteContent({ route }) {
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

  return (
    <Route pathname="/">
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
