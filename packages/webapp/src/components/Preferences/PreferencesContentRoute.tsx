import React, { Suspense } from 'react';
import { Route, Switch } from 'react-router-dom';
import { getPreferenceRoutes } from '@/routes/preferences';
import { Spinner } from '@blueprintjs/core';
import { Box } from '../Layout';

/**
 * Раздел настроек.
 *
 * У маршрута стояло `pathname="/preferences"` — такого свойства у маршрута нет
 * вовсе. Путь оставался незаданным, и маршрут совпадал с **любым** адресом, а
 * не только с разделом настроек (Д31 карты v75).
 */
export default function DashboardContentRoute() {
  const preferencesRoutes = getPreferenceRoutes();

  return (
    <Route path="/preferences">
      <Suspense
        fallback={
          <Box style={{ padding: 20 }}>
            <Spinner size={20} />
          </Box>
        }
      >
        <Switch>
          {preferencesRoutes.map((route, index) => (
            <Route
              key={index}
              path={`${route.path}`}
              exact={route.exact}
              component={route.component}
            />
          ))}
        </Switch>
      </Suspense>
    </Route>
  );
}
