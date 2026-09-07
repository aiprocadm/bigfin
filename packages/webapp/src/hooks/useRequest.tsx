import React from 'react';
import axios from 'axios';
import {
  useAuthActions,
  useAuthOrganizationId,
  useSetGlobalErrors,
  useAuthToken,
} from './state';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { AppToaster } from '@/components/AppToaster';
import { getCookie, normalizeApiPath } from '../utils';
import { getRequestLocale } from '../services/requestLocale';
import { isFeatureDisabledResponse } from './featureDisabledResponse';
import {
  withCamelAliases,
  shouldAliasResponse,
} from '../utils/withCamelAliases';

export default function useApiRequest() {
  const setGlobalErrors = useSetGlobalErrors();
  const { setLogout } = useAuthActions();
  const currentLocale = getRequestLocale();

  // Authentication token.
  const token = useAuthToken();

  // Authentication organization id.
  const organizationId = useAuthOrganizationId();

  const http = React.useMemo(() => {
    // Axios instance.
    const instance = axios.create();

    // Request interceptors.
    instance.interceptors.request.use(
      (request) => {
        const locale = currentLocale;

        if (token) {
          request.headers['Authorization'] = `Bearer ${token}`;
        }
        if (organizationId) {
          request.headers['organization-id'] = organizationId;
        }
        if (locale) {
          request.headers['Accept-Language'] = locale;
        }
        return request;
      },
      (error) => {
        return Promise.reject(error);
      },
    );
    // Response interceptors.
    instance.interceptors.response.use(
      (response) => {
        // Сервер отдаёт поля в snake_case, а страницы читают их в camelCase.
        // Добавляем camelCase-псевдонимы рядом с исходными ключами: старый код
        // продолжает работать, новый перестаёт получать undefined.
        if (shouldAliasResponse(response.config?.url)) {
          withCamelAliases(response.data);
        }
        return response;
      },
      (error) => {
        // Обрыв сети: ответа нет вовсе — раньше деструктуризация ниже падала
        // TypeError, и пользователь не видел ничего. Показываем «нет связи»
        // один раз здесь и помечаем ошибку, чтобы showApiError не дублировал.
        if (!error.response) {
          AppToaster.show({
            message: intl.get('error.network'),
            intent: Intent.DANGER,
          });
          error.isNetworkError = true;
          return Promise.reject(error);
        }
        const { status, data } = error.response;

        if (status >= 500) {
          setGlobalErrors({ something_wrong: true });
        }
        if (status === 401) {
          setGlobalErrors({ session_expired: true });
          setLogout();
        }
        if (status === 403 && !isFeatureDisabledResponse(data)) {
          // Выключенный модуль тоже отвечает 403, но это не отказ в правах:
          // о нём рассказывает сам экран раздела (П1 карты v36).
          setGlobalErrors({ access_denied: { message: data.message } });
        }
        if (status === 429) {
          setGlobalErrors({ too_many_requests: true });
        }
        if (status === 400) {
          // 400 не обязан нести errors[] (например, сырой ответ прокси).
          const businessErrors = data.errors ?? [];
          const lockedError = businessErrors.find(
            (error: any) => error.type === 'TRANSACTIONS_DATE_LOCKED',
          );
          if (lockedError) {
            setGlobalErrors({ transactionsLocked: { ...lockedError.payload } });
          }
          if (
            businessErrors.find(
              (e: any) => e.type === 'ORGANIZATION.SUBSCRIPTION.INACTIVE',
            )
          ) {
            setGlobalErrors({ subscriptionInactive: true });
          }
          if (businessErrors.find((e: any) => e.type === 'USER_INACTIVE')) {
            setGlobalErrors({ userInactive: true });
            setLogout();
          }
        }
        return Promise.reject(error);
      },
    );
    return instance;
  }, [token, organizationId, setGlobalErrors, setLogout]);

  return React.useMemo(
    () => ({
      http,

      get(resource: any, params?: any) {
        return http.get(`/api/${normalizeApiPath(resource)}`, params);
      },

      post(resource: any, params?: any, config?: any) {
        return http.post(`/api/${normalizeApiPath(resource)}`, params, config);
      },

      update(resource: any, slug: any, params?: any) {
        return http.put(`/api/${normalizeApiPath(resource)}/${slug}`, params);
      },

      put(resource: any, params?: any) {
        return http.put(`/api/${normalizeApiPath(resource)}`, params);
      },

      patch(resource: any, params?: any, config?: any) {
        return http.patch(`/api/${normalizeApiPath(resource)}`, params, config);
      },

      delete(resource: any, params?: any) {
        return http.delete(`/api/${normalizeApiPath(resource)}`, params);
      },
    }),
    [http],
  );
}

export function useAuthApiRequest() {
  const http = React.useMemo(() => {
    // Axios instance.
    return axios.create();
  }, []);

  return React.useMemo(
    () => ({
      http,
      get(resource: any, params?: any) {
        return http.get(`/api/${normalizeApiPath(resource)}`, params);
      },
      post(resource: any, params?: any, config?: any) {
        return http.post(`/api/${normalizeApiPath(resource)}`, params, config);
      },
      update(resource: any, slug: any, params?: any) {
        return http.put(`/api/${normalizeApiPath(resource)}/${slug}`, params);
      },
      put(resource: any, params?: any) {
        return http.put(`/api/${normalizeApiPath(resource)}`, params);
      },
      patch(resource: any, params?: any, config?: any) {
        return http.patch(`/api/${normalizeApiPath(resource)}`, params, config);
      },
      delete(resource: any, params?: any) {
        return http.delete(`/api/${normalizeApiPath(resource)}`, params);
      },
    }),
    [http],
  );
}