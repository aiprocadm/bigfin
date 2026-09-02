// © 2026 Bigfin
import { describe, it, expect } from 'vitest';

import { getDashboardRoutes } from './dashboard';

/**
 * Карта v52. Путь маршрута должен быть путём, а не строкой запроса.
 *
 * В таблице маршрутов жили три записи вида
 * `/items/new?duplicate=/:id` и `/vendors/contact_duplicate=/:id`.
 *
 * Знак «?» в пути маршрута — не начало строки запроса, а модификатор
 * «предыдущий символ необязателен». Такой путь не совпадёт ни с одной
 * ссылкой: живые ссылки ведут на `/items/new?duplicate=123`, где `?…` —
 * строка запроса, и их ловит обычный маршрут `/items/new`. Само же
 * дублирование работает через состояние перехода (`state.action`), а не
 * через адрес.
 *
 * Мёртвый маршрут опасен не сам по себе, а тем, что прячет ошибки: два из
 * трёх грузили страницу неправильно (объект вместо функции; загрузка без
 * обёртки в `default`), и это молчало, потому что файл таблицы маршрутов
 * лежал вне проверки типов (карта v51).
 */
describe('пути маршрутов', () => {
  const routes = getDashboardRoutes();

  it('таблица маршрутов прочитана', () => {
    // Иначе проверки ниже стали бы пустыми и зелёными.
    expect(routes.length).toBeGreaterThan(100);
  });

  it('ни один путь не содержит знака вопроса', () => {
    const withQuery = routes
      .map((route: any) => String(route.path ?? ''))
      .filter((path: string) => path.includes('?'));

    expect(withQuery).toEqual([]);
  });

  it('ни один путь не содержит знака равенства', () => {
    // `contact_duplicate=/:id` — тоже не путь, а обрывок строки запроса,
    // случайно попавший в таблицу маршрутов.
    const withEquals = routes
      .map((route: any) => String(route.path ?? ''))
      .filter((path: string) => path.includes('='));

    expect(withEquals).toEqual([]);
  });
});
