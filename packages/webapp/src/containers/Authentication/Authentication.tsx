// @ts-nocheck
import { Route, Switch, useLocation } from 'react-router-dom';
import BodyClassName from 'react-body-classname';
import { Suspense } from 'react';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import { Spinner } from '@blueprintjs/core';

import authenticationRoutes from '@/routes/authentication';
import { Box } from '@/components';
import { AuthMetaBootProvider } from './AuthMetaBoot';

import '@/style/pages/Authentication/Auth.scss';

/**
 * Auth shell. The new Bold Fintech pages (LoginPage, RegisterPage,
 * ForgotPasswordPage) render their own full-bleed AuthLayout with logo
 * and footer, so this shell no longer paints a centred logo wrapper.
 *
 * The remaining responsibilities are intentional:
 * - BodyClassName='authentication' keeps the legacy Auth.scss applied
 *   so the still-legacy ResetPassword / InviteAccept / EmailConfirmation
 *   screens render unchanged.
 * - AuthMetaBootProvider boots auth/meta (signupDisabled etc.) and is
 *   read by the still-legacy ResetPassword.tsx.
 * - Suspense covers the lazy chunks declared in routes/authentication.
 */
export function Authentication() {
  return (
    <BodyClassName className={'authentication'}>
      <AuthMetaBootProvider>
        <Suspense
          fallback={
            <Box style={{ marginTop: '5rem' }}>
              <Spinner size={30} />
            </Box>
          }
        >
          <AuthenticationRoutes />
        </Suspense>
      </AuthMetaBootProvider>
    </BodyClassName>
  );
}

function AuthenticationRoutes() {
  const location = useLocation();
  const locationKey = location.pathname;

  return (
    <TransitionGroup>
      <CSSTransition
        timeout={500}
        key={locationKey}
        classNames="authTransition"
      >
        <Switch>
          {authenticationRoutes.map((route, index) => (
            <Route
              key={index}
              path={route.path}
              exact={route.exact}
              component={route.component}
            />
          ))}
        </Switch>
      </CSSTransition>
    </TransitionGroup>
  );
}
