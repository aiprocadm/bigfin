import { lazy, Suspense } from 'react';
import { Router, Switch, Route } from 'react-router-dom';
import { createBrowserHistory } from 'history';
import type { History } from 'history';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import '@/style/App.scss';
import 'moment/locale/ar-ly';
import 'moment/locale/es-us';
import 'moment/locale/ru';

import AppIntlLoader from './AppIntlLoader';
import { EnsureAuthenticated } from '@/components/Guards/EnsureAuthenticated';
import GlobalErrors from '@/containers/GlobalErrors/GlobalErrors';

import { SplashScreen, DashboardThemeProvider } from '../components';
import { queryConfig } from '../hooks/query/base';
import { EnsureUserEmailNotVerified } from './Guards/EnsureUserEmailNotVerified';
import { Toaster } from './ui/sonner';

const DashboardPrivatePages = lazy(
  () => import('@/components/Dashboard/PrivatePages'),
);
const AuthenticationPage = lazy(
  () => import('@/containers/Authentication/AuthenticationPage'),
);
const EmailConfirmationPage = lazy(() =>
  import('@/components/auth/EmailConfirmationPage').then((m) => ({
    default: m.EmailConfirmationPage,
  })),
);
const RegisterVerifyPage = lazy(() =>
  import('@/components/auth/RegisterVerifyPage').then((m) => ({
    default: m.RegisterVerifyPage,
  })),
);
const OneClickDemoPage = lazy(
  () => import('@/containers/OneClickDemo/OneClickDemoPage'),
);
const PaymentPortalPage = lazy(
  () => import('@/containers/PaymentPortal/PaymentPortalPage'),
);
const PrivacyPage = lazy(() => import('@/components/legal/PrivacyPage'));
const TermsPage = lazy(() => import('@/components/legal/TermsPage'));

/**
 * App inner.
 */
function AppInsider({ history }: { history: History }) {
  return (
    <div className="App">
      <DashboardThemeProvider>
        <Suspense fallback={'Loading...'}>
          <Router history={history}>
            <Switch>
              <Route path={'/one_click_demo'} children={<OneClickDemoPage />} />
              <Route path={'/auth/register/verify'}>
                <EnsureAuthenticated>
                  <EnsureUserEmailNotVerified>
                    <RegisterVerifyPage />
                  </EnsureUserEmailNotVerified>
                </EnsureAuthenticated>
              </Route>

              <Route
                path={'/auth/email_confirmation'}
                children={<EmailConfirmationPage />}
              />
              <Route path={'/auth'} children={<AuthenticationPage />} />
              <Route
                path={'/payment/:linkId'}
                children={<PaymentPortalPage />}
              />
              <Route path={'/privacy'} children={<PrivacyPage />} />
              <Route path={'/terms'} children={<TermsPage />} />
              <Route path={'/'} children={<DashboardPrivatePages />} />
            </Switch>
          </Router>
        </Suspense>

        <GlobalErrors />
        {/* Показчик уведомлений — ОДИН на всё приложение (UI-044-9 ТЗ-4):
            два рисуют каждое сообщение дважды, ни одного — и сообщения на
            страницах вне рабочей части пропадают. */}
        <Toaster />
      </DashboardThemeProvider>
    </div>
  );
}

/**
 * Core application.
 */
export default function App() {
  // Browser history.
  const history = createBrowserHistory();

  // Query client.
  const queryClient = new QueryClient(queryConfig);

  return (
    <QueryClientProvider client={queryClient}>
      <SplashScreen />

      <AppIntlLoader>
        <AppInsider history={history} />
      </AppIntlLoader>

      <ReactQueryDevtools initialIsOpen />
    </QueryClientProvider>
  );
}
