import React from 'react';
import { Switch, Route } from 'react-router-dom';

import '@/style/pages/Dashboard/Dashboard.scss';

import DashboardContent from '@/components/Dashboard/DashboardContent';
import DialogsContainer from '@/components/DialogsContainer';
import PreferencesPage from '@/components/Preferences/PreferencesPage';
import DashboardUniversalSearchItemActions from '@/containers/UniversalSearch/DashboardUniversalSearchItemActions';
import DashboardUniversalSearchHotkeys from '@/containers/UniversalSearch/DashboardUniversalSearchHotkeys';
import { ConnectedCommandPalette } from './ConnectedCommandPalette';
import GlobalHotkeys from './GlobalHotkeys';
import DashboardProvider from './DashboardProvider';
import DrawersContainer from '@/components/DrawersContainer';
import AlertsContainer from '@/containers/AlertsContainer';
import { DashboardSockets } from './DashboardSockets';
import { DashboardShell } from '@/components/Dashboard/DashboardShell';
import { ConnectedSidebar } from '@/components/Dashboard/ConnectedSidebar';
import { ConnectedTopbar } from '@/components/Dashboard/ConnectedTopbar';
import { ConnectedBottomNav } from '@/components/Dashboard/ConnectedBottomNav';
import { AccessPreviewBanner } from './AccessPreviewBanner';

/**
 * Dashboard preferences.
 */
function DashboardPreferences() {
  return (
    <DashboardShell
      // Одно меню настроек (UI-045-5 ТЗ-4): главное меню здесь — значками.
      // Три колонки навигации рядом съедали половину экрана (O16).
      sidebar={<ConnectedSidebar forceMini />}
      topbar={<ConnectedTopbar />}
      bottomNav={(openMenu) => <ConnectedBottomNav onOpenMenu={openMenu} />}
      banner={<AccessPreviewBanner />}
    >
      <PreferencesPage />
    </DashboardShell>
  );
}

/**
 * Dashboard other routes.
 */
function DashboardAnyPage() {
  return (
    <DashboardShell
      sidebar={<ConnectedSidebar />}
      topbar={<ConnectedTopbar />}
      bottomNav={(openMenu) => <ConnectedBottomNav onOpenMenu={openMenu} />}
      banner={<AccessPreviewBanner />}
    >
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
      {/* Командная строка вместо старого окна поиска (UI-045-4 ТЗ-4). Само
          окно `UniversalSearch` не удалено — удаление только с разрешения
          владельца, — но из интерфейса недоступно. Обработчики выбора
          записи и клавиша Shift+P остаются: ими пользуется командная
          строка. */}
      <ConnectedCommandPalette />
      <DashboardUniversalSearchItemActions />
      <DashboardUniversalSearchHotkeys />
      <GlobalHotkeys />
      <DialogsContainer />
      <DrawersContainer />
      <AlertsContainer />
    </DashboardProvider>
  );
}
