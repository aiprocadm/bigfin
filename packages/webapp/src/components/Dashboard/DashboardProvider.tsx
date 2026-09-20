import React, { useEffect } from 'react';
import { Intent } from '@blueprintjs/core';
import { DashboardAbilityProvider, AppToaster } from '../../components';
import { useDashboardMetaBoot } from './DashboardBoot';
import intl from 'react-intl-universal';
import { useDisplayPreferencesBoot } from '@/hooks/useDisplayPreferencesBoot';

/**
 * Dashboard provider.
 */
export default function DashboardProvider({ children }: any) {
  const { isLoading } = useDashboardMetaBoot();

  // Личные настройки вида грузятся один раз при входе: их читает печать
  // сумм во всём продукте (FIN-026). Ждать их не нужно — до ответа
  // действуют значения по умолчанию.
  useDisplayPreferencesBoot();

  // Show toast when user has switched workspaces
  useEffect(() => {
    const switchedWorkspaceName = sessionStorage.getItem('switchedWorkspaceName');
    if (switchedWorkspaceName) {
      AppToaster.show({
        message: intl.get('workspace.switched_successfully', {
          name: switchedWorkspaceName,
        }),
        intent: Intent.SUCCESS,
      });
      sessionStorage.removeItem('switchedWorkspaceName');
    }
  }, []);

  // Avoid display any dashboard component before complete booting.
  if (isLoading) {
    return null;
  }
  return <DashboardAbilityProvider>{children}</DashboardAbilityProvider>;
}
