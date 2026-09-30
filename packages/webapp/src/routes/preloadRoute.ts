import { matchPath } from 'react-router-dom';
import { canPreload } from '@/utils/lazyWithPreload';
import { getDashboardRoutes, type DashboardRoute } from './dashboard';

/**
 * Начать загрузку экрана по адресу, не переходя на него (UI-055-3 ТЗ-4).
 *
 * Маршрут ищется так же, как его выберет `Switch`: первый подходящий по
 * порядку записей. Ошибка загрузки здесь молчит — при самом переходе загрузка
 * повторится и покажет ошибку как обычно.
 */
export function preloadRoute(href: string, routes: DashboardRoute[] = getDashboardRoutes()): boolean {
  const pathname = href.split(/[?#]/)[0];
  const route = routes.find((r) => matchPath(pathname, { path: r.path, exact: r.exact }));
  if (!route || !canPreload(route.component)) return false;
  route.component.preload().catch(() => undefined);
  return true;
}
