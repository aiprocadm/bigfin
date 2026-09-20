import { lazy } from 'react';

const BASE_URL = '/preferences';

export const getPreferenceRoutes = () => [
  {
    path: `${BASE_URL}/general`,
    component: lazy(() => import('@/containers/Preferences/General/General')),
    exact: true,
  },
  {
    path: `${BASE_URL}/branding`,
    component: lazy(
      () =>
        import('../containers/Preferences/Branding/PreferencesBrandingPage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/users`,
    component: lazy(() => import('../containers/Preferences/Users/Users')),
    exact: true,
  },
  {
    path: `${BASE_URL}/security`,
    component: lazy(
      () =>
        import('../containers/Preferences/Security/PreferencesSecurityPage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/invoices`,
    component: lazy(
      () => import('../containers/Preferences/Invoices/PreferencesInvoices'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/payment-methods`,
    component: lazy(
      () =>
        import(
          '../containers/Preferences/PaymentMethods/PreferencesPaymentMethodsPage'
        ),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/payment-methods/stripe/callback`,
    component: lazy(
      () =>
        import(
          '../containers/Preferences/PaymentMethods/PreferencesStripeCallback'
        ),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/credit-notes`,
    component: lazy(() =>
      import(
        '../containers/Preferences/CreditNotes/PreferencesCreditNotes'
      ).then((module) => ({ default: module.PreferencesCreditNotes })),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/estimates`,
    component: lazy(() =>
      import('@/containers/Preferences/Estimates/PreferencesEstimates').then(
        (module) => ({ default: module.PreferencesEstimates }),
      ),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/receipts`,
    component: lazy(() =>
      import('@/containers/Preferences/Receipts/PreferencesReceipts').then(
        (module) => ({ default: module.PreferencesReceipts }),
      ),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/roles`,
    component: lazy(
      () =>
        import('../containers/Preferences/Users/Roles/RolesForm/RolesFormPage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/roles/:id`,
    component: lazy(
      () =>
        import('../containers/Preferences/Users/Roles/RolesForm/RolesFormPage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/currencies`,
    component: lazy(
      () => import('@/containers/Preferences/Currencies/Currencies'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/warehouses`,
    component: lazy(() => import('../containers/Preferences/Warehouses')),
    exact: true,
  },
  {
    path: `${BASE_URL}/branches`,
    component: lazy(() => import('../containers/Preferences/Branches')),
    exact: true,
  },
  {
    path: `${BASE_URL}/accountant`,
    component: lazy(
      () => import('@/containers/Preferences/Accountant/Accountant'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/items`,
    component: lazy(() => import('@/containers/Preferences/Item')),
    exact: true,
  },
  {
    path: `${BASE_URL}/api-keys`,
    component: lazy(() => import('@/containers/Preferences/ApiKeys/ApiKeys')),
    exact: true,
  },
  // Настройки ИИ-аналитика (этап 13 ТЗ): провайдер и ключ доступа.
  {
    path: `${BASE_URL}/ai-analyst`,
    component: lazy(
      () => import('@/containers/Preferences/AiAnalyst/AiAnalystPage'),
    ),
    exact: true,
  },
  // Публичный API (этап 15 ТЗ): токены и вебхуки. Отдельно от «Ключей API» —
  // это разные вещи: там ключи внутренних интеграций, здесь доступ наружу.
  {
    path: `${BASE_URL}/public-api`,
    component: lazy(
      () => import('@/containers/Preferences/PublicApi/PublicApiPage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/interface-mode`,
    component: lazy(
      () =>
        import('@/containers/Preferences/InterfaceMode/InterfaceModePage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/modules`,
    component: lazy(() => import('@/containers/Preferences/Modules/ModulesPage')),
    exact: true,
  },
  {
    // Группы денежных счетов (FIN-017 ТЗ-2). Здесь, а не в списке счетов:
    // тот экран помечен `@ts-nocheck`, а ЧАСТЬ A2 ТЗ запрещает трогать
    // такие файлы в рамках работ по ТЗ.
    path: `${BASE_URL}/account-groups`,
    component: lazy(
      () => import('@/containers/Preferences/AccountGroups/AccountGroupsPage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/export-data`,
    component: lazy(
      () => import('@/containers/Preferences/ExportData/ExportDataPage'),
    ),
    exact: true,
  },
  {
    path: `${BASE_URL}/`,
    component: lazy(() => import('../containers/Preferences/DefaultRoute')),
    exact: true,
  },
];
