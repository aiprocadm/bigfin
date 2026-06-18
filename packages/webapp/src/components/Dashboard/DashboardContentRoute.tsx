// @ts-nocheck
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { getDashboardRoutes } from '@/routes/dashboard';
import DashboardPage from './DashboardPage';
import { useAccountantOnlyRouteGuard } from '@/hooks/state/interfaceMode';

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
  useAccountantOnlyRouteGuard();
  const routes = getDashboardRoutes();

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
