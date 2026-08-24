// @ts-nocheck
import React, { createContext } from 'react';
import { useAuthMetadata } from '@/hooks/query';
import { Spinner } from '@blueprintjs/core';
import styled from 'styled-components';

export interface AuthMetaBootValue {
  isAuthMetaLoading: boolean;
  /** Владелец закрыл регистрацию: форму показывать нельзя. */
  signupDisabled: boolean;
  /** Демо «в один щелчок» включено на сервере (Д1 карты v18). */
  oneClickDemoEnabled: boolean;
  /** Куда ведёт кнопка «Посмотреть демо». */
  oneClickDemoUrl: string;
}

const AuthMetaBootContext = createContext();

/**
 * Boots the authentication page metadata.
 */
function AuthMetaBootProvider({ ...props }) {
  const { isLoading: isAuthMetaLoading, data: authMeta } = useAuthMetadata();

  // Сервер отдаёт поля ПЛОСКО: `{ "signup_disabled": false }`. Лишняя
  // ступенька `meta` делала поле мёртвым — закрытая регистрация никак не
  // отражалась на экране (М4 карты v15).
  const state = {
    isAuthMetaLoading,
    signupDisabled: Boolean(authMeta?.signup_disabled),
    // Демо-режим приходит тем же плоским полем `one_click_demo` (Д1 v18);
    // читаем здесь, чтобы у страницы демо и мастера был один источник.
    oneClickDemoEnabled: Boolean(authMeta?.one_click_demo?.enable),
    oneClickDemoUrl: authMeta?.one_click_demo?.demo_url ?? '/demo',
  };

  if (isAuthMetaLoading) {
    return (
      <SpinnerRoot>
        <Spinner size={30} value={null} />
      </SpinnerRoot>
    );
  }
  return <AuthMetaBootContext.Provider value={state} {...props} />;
}

/**
 * Значения по умолчанию нужны, когда страницу рисуют вне провайдера
 * (например в тестах): без них разбор значения роняет весь экран.
 */
const EMPTY_AUTH_META: AuthMetaBootValue = {
  isAuthMetaLoading: false,
  signupDisabled: false,
  oneClickDemoEnabled: false,
  oneClickDemoUrl: '/demo',
};

const useAuthMetaBoot = (): AuthMetaBootValue =>
  (React.useContext(AuthMetaBootContext) as AuthMetaBootValue) ??
  EMPTY_AUTH_META;

export { AuthMetaBootContext, AuthMetaBootProvider, useAuthMetaBoot };

const SpinnerRoot = styled.div`
  margin-top: 5rem;
`;
