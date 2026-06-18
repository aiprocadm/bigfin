// @ts-nocheck
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCurrentOrganization } from '@/hooks/state/organizations';
import { useFeatureCan } from '@/hooks/state/feature';
import { Features } from '@/constants/features';
import {
  INTERFACE_MODE,
  isAccountantOnlyHidden,
  isAccountantOnlyPath,
} from '@/constants/interfaceMode';

/**
 * Текущий режим интерфейса организации (пусто → business).
 */
export const useInterfaceMode = () => {
  const organization = useCurrentOrganization();
  return organization?.metadata?.interfaceMode ?? INTERFACE_MODE.Business;
};

/**
 * Редиректит на главную, если открыт accountant-only маршрут,
 * а режим = business (и фича включена). Монтируется один раз в дашборде.
 */
export const useAccountantOnlyRouteGuard = () => {
  const history = useHistory();
  const location = useLocation();
  const mode = useInterfaceMode();
  const { featureCan } = useFeatureCan();

  React.useEffect(() => {
    const hidden = isAccountantOnlyHidden(
      mode,
      featureCan(Features.InterfaceModes),
    );
    if (hidden && isAccountantOnlyPath(location.pathname)) {
      history.replace('/');
    }
  }, [location.pathname, mode]);
};
