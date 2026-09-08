import axios from 'axios';
import { store } from '@/store/create-store';
import { getRequestLocale } from './requestLocale';
const http = axios.create();


http.interceptors.request.use((request) => {
  const state = store.getState();
  // Поле называется `organizationId`. Раньше здесь читали `organization` —
  // такого поля в хранилище нет, значение всегда выходило пустым, и заголовок
  // с организацией по этому пути **не отправлялся никогда**. Через него идут
  // настройки, валюты и привязка данных; основной путь (`useRequest`) читает
  // поле правильно, поэтому расхождение и не бросалось в глаза (Д21 карты v75).
  const { token, organizationId } = state.authentication;
  // Язык запроса — тот, на котором человек смотрит продукт (тот же cookie
  // `locale`, что выбирает язык интерфейса). Раньше здесь стояла забытая
  // отладочная строка `'ar'`: арабского словаря у сервера нет, и он
  // откатывался на английский — русская организация получала отчёты со
  // строками «Assets» и «Accounts Receivable», хотя весь русский перевод
  // был готов. Держится сторожем `requestLanguage.spec.ts`.
  const locale = getRequestLocale();

  if (token) {
    request.headers.common['x-access-token'] = token;
  }
  if (organizationId) {
    request.headers.common['organization-id'] = organizationId;
  }
  if (locale) {
    request.headers.common['Accept-Language'] = locale;
  }

  return request;
}, (error) => {
  return Promise.reject(error);
});

http.interceptors.response.use((response) => response, (error) => {
  const { status } = error.response;

  // if (status >= 500) {
  //   store.dispatch(setGlobalErrors({ something_wrong: true }));
  // }
  // if (status === 401) {
  //   // store.dispatch(setGlobalErrors({ session_expired: true }));
  //   // store.dispatch(logout());
  // }
  return Promise.reject(error);
});

export default http;