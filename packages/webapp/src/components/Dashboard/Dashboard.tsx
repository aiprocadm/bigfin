// @ts-nocheck
import React from 'react';
import { Switch, Route } from 'react-router';

import '@/style/pages/Dashboard/Dashboard.scss';

import DashboardContent from '@/components/Dashboard/DashboardContent';
import DialogsContainer from '@/components/DialogsContainer';
import PreferencesPage from '@/components/Preferences/PreferencesPage';
import DashboardUniversalSearch from '@/containers/UniversalSearch/DashboardUniversalSearch';
import GlobalHotkeys from './GlobalHotkeys';
import DashboardProvider from './DashboardProvider';
import DrawersContainer from '@/components/DrawersContainer';
import AlertsContainer from '@/containers/AlertsContainer';
import { DashboardSockets } from './DashboardSockets';
import { DashboardShell } from '@/components/Dashboard/DashboardShell';
import { ConnectedSidebar } from '@/components/Dashboard/ConnectedSidebar';
import { ConnectedTopbar } from '@/components/Dashboard/ConnectedTopbar';

/**
 * Dashboard preferences.
 */
function DashboardPreferences() {
  return (
    <DashboardShell sidebar={<ConnectedSidebar />} topbar={<ConnectedTopbar />}>
      <PreferencesPage />
    </DashboardShell>
  );
}

/**
 * Dashboard other routes.
 */
function DashboardAnyPage() {
  return (
    <DashboardShell sidebar={<ConnectedSidebar />} topbar={<ConnectedTopbar />}>
      <DashboardContent />
    </DashboardShell>
  );
}

/**
 * Dashboard page.
 */
export default function Dashboard() {
  return (
    <DashboardProvider>
      <Switch>
        <Route path="/preferences" component={DashboardPreferences} />
        <Route path="/" component={DashboardAnyPage} />
      </Switch>

      <DashboardSockets />
      <DashboardUniversalSearch />
      <GlobalHotkeys />
      <DialogsContainer />
      <DrawersContainer />
      <AlertsContainer />
    </DashboardProvider>
  );
}
