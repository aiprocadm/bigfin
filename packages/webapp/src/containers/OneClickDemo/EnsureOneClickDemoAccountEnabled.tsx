import React from 'react';
import { Redirect } from 'react-router-dom';
import { useOneClickDemoBoot } from './OneClickDemoBoot';

interface EnsureOneClickDemoAccountEnabledProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const EnsureOneClickDemoAccountEnabled = ({
  children,
  redirectTo = '/',
}: EnsureOneClickDemoAccountEnabledProps) => {
  // Раньше читали `authMeta.meta.one_click_demo` — лишняя ступенька `meta`
  // делала поле мёртвым, и страница демо была недостижима всегда
  // (та же грабля, что с закрытой регистрацией; Д1 карты v18).
  const { isDemoEnabled } = useOneClickDemoBoot();
  const enabled = isDemoEnabled;

  if (!enabled) {
    return <Redirect to={{ pathname: redirectTo }} />;
  }
  return <>{children}</>;
};
