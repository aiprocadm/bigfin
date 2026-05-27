// @ts-nocheck
import { lazy } from 'react';

const BASE_URL = '/auth';

export default [
  {
    path: `${BASE_URL}/login`,
    component: lazy(() =>
      import('@/components/auth/LoginPage').then((m) => ({
        default: m.LoginPage,
      })),
    ),
  },
  {
    // Legacy underscore URL — kept so password-reset emails already in
    // the wild still land on the right screen.
    path: `${BASE_URL}/send_reset_password`,
    component: lazy(() =>
      import('@/components/auth/ForgotPasswordPage').then((m) => ({
        default: m.ForgotPasswordPage,
      })),
    ),
  },
  {
    // New kebab URL — what the Bold Fintech UI links to.
    path: `${BASE_URL}/forgot-password`,
    component: lazy(() =>
      import('@/components/auth/ForgotPasswordPage').then((m) => ({
        default: m.ForgotPasswordPage,
      })),
    ),
  },
  {
    // Legacy underscore URL — kept so password-reset emails already in
    // the wild still land on the right screen.
    path: `${BASE_URL}/reset_password/:token`,
    component: lazy(() =>
      import('@/components/auth/ResetPasswordPage').then((m) => ({
        default: m.ResetPasswordPage,
      })),
    ),
  },
  {
    path: `${BASE_URL}/invite/:token/accept`,
    component: lazy(() => import('@/containers/Authentication/InviteAccept')),
  },
  {
    path: `${BASE_URL}/register/email_confirmation`,
    component: lazy(
      () => import('@/containers/Authentication/EmailConfirmation'),
    ),
  },
  {
    path: `${BASE_URL}/register`,
    component: lazy(() =>
      import('@/components/auth/RegisterPage').then((m) => ({
        default: m.RegisterPage,
      })),
    ),
  },
];
