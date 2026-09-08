// @ts-nocheck
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import classNames from 'classnames';
import { CLASSES } from '@/constants/classes';

import DashboardTopbarUser from '@/components/Dashboard/TopbarUser';
import UsersActions from '@/containers/Preferences/Users/UsersActions';
import CurrenciesActions from '@/containers/Preferences/Currencies/CurrenciesActions';
import WarehousesActions from '@/containers/Preferences/Warehouses/WarehousesActions';
import BranchesActions from '@/containers/Preferences/Branches/BranchesActions';
import ApiKeysActions from '@/containers/Preferences/ApiKeys/ApiKeysActions';
import { withDashboard } from '@/containers/Dashboard/withDashboard';

import { compose } from '@/utils';

import '@/style/pages/Preferences/Topbar.scss';

/**
 * Preferences topbar.
 */
interface PreferencesTopbarProps {
  /** Заголовок раздела настроек. Подставляет обёртка `withDashboard`. */
  preferencesPageTitle?: React.ReactNode;
}

function PreferencesTopbar({
  preferencesPageTitle,
}: PreferencesTopbarProps) {
  return (
    <div
      className={classNames(
        CLASSES.PREFERENCES_PAGE_TOPBAR,
        CLASSES.PREFERENCES_TOPBAR,
      )}
    >
      <div className="preferences-topbar__title">
        <h2>{preferencesPageTitle}</h2>
      </div>
      <div className="preferences-topbar__actions">
        {/* Было `pathname` — такого свойства у маршрута нет. То же самое
            карта v75 нашла в содержимом настроек; здесь второе место
            (Д10 карты v76). */}
        <Route path="/preferences">
          <Switch>
            <Route exact path={'/preferences/users'} component={UsersActions} />
            <Route
              exact
              path={'/preferences/currencies'}
              component={CurrenciesActions}
            />
            <Route
              exact
              path={'/preferences/warehouses'}
              component={WarehousesActions}
            />
            <Route
              exact
              path={'/preferences/branches'}
              component={BranchesActions}
            />
            <Route
              exact
              path={'/preferences/api-keys'}
              component={ApiKeysActions}
            />
          </Switch>
        </Route>
      </div>

      <div className="preferences-topbar__user">
        <DashboardTopbarUser />
      </div>
    </div>
  );
}

export default compose(
  withDashboard(({ preferencesPageTitle }) => ({ preferencesPageTitle })),
)(PreferencesTopbar);
