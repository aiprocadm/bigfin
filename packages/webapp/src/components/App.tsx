// @ts-nocheck
// Пометка возвращена намеренно (Д27 карты v82).
//
// Файл ввозит `createBrowserHistory` из пакета `history`, а объявлений типов у
// него нет: `@types/history` лежит в хранилище как зависимость
// `@types/react-router-dom`, но наверх не поднят, и разрешить его неоткуда.
//
// Два обхода отвергнуты:
//   — поставить `@types/history` зависимостью: это правит `pnpm-lock.yaml`,
//     а файл замков затрагивает стенд и защищён отдельным хуком (карта v66);
//   — объявить заглушку `declare module 'history'`: она перекроет настоящие
//     типы, на которые изнутри ссылается `@types/react-router-dom`.
//
// Оба решения — за владельцем, поэтому здесь проведена явная граница.
import { lazy, Suspense } from 'react';
import { Router, Switch, Route } from 'react-router-dom';
import { createBrowserHistory } from 'history';
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
function AppInsider({ history }) {
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
