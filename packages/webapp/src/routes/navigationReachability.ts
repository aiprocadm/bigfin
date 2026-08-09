// © 2026 Bigfin
/**
 * Сверка «страница модуля ↔ пункт меню» — шаг Д8 карты v6.
 *
 * Самый частый дефект проекта: модуль написан, страница открывается по прямой
 * ссылке, а кликнуть по ней негде. Приёмка #185 нашла сразу 12 таких страниц,
 * и у всех была одна причина — пункт меню забыли добавить.
 *
 * Здесь только разбор данных: маршруты берём из описания страниц, ссылки — из
 * меню. Проверку делает тест рядом.
 */

/** Пункт меню в любом из двух форматов: боковое меню или меню настроек. */
interface MenuNode {
  href?: string;
  children?: MenuNode[];
  items?: MenuNode[];
}

/** Описание страницы из таблицы маршрутов. */
interface RouteNode {
  path?: string;
  children?: RouteNode[];
}

/**
 * Страницы, у которых пункта меню намеренно нет.
 *
 * Каждая строка — осознанное решение, а не «потом добавим»: тест следит, что
 * такая страница всё ещё существует и что она действительно не в меню.
 */
export const UNLINKED_MODULE_ROUTES = new Set<string>([
  // Модуль проектов достался от исходной кодовой базы и в Bigfin не входит:
  // его место занимают «Сделки». Пункт меню намеренно закомментирован, сама
  // страница пока оставлена — удалять её отдельное решение владельца.
  '/projects',
]);

/**
 * Корневые страницы модулей: один сегмент пути, без параметров.
 *
 * Вложенные страницы (`/invoices/new`, `/items/import`) не проверяем — на них
 * попадают со своей же корневой страницы, а не из меню.
 */
export const collectModuleRoutes = (routes: RouteNode[]): string[] => {
  const found = new Set<string>();

  const walk = (nodes: RouteNode[] = []) => {
    nodes.forEach((node) => {
      const path = node?.path;

      if (typeof path === 'string' && isModuleRoute(path)) {
        found.add(path);
      }
      walk(node?.children);
    });
  };
  walk(routes);

  return [...found].sort();
};

/** Корневая страница модуля: `/budgets`, но не `/` и не `/invoices/:id`. */
const isModuleRoute = (path: string): boolean =>
  path.startsWith('/') &&
  path !== '/' &&
  !path.includes(':') &&
  !path.includes('*') &&
  path.slice(1).split('/').length === 1;

/** Все адреса, на которые можно кликнуть в меню (с любой глубины вложенности). */
export const collectMenuLinks = (menu: MenuNode[]): Set<string> => {
  const links = new Set<string>();

  const walk = (nodes: MenuNode[] = []) => {
    nodes.forEach((node) => {
      if (typeof node?.href === 'string') {
        links.add(node.href);
      }
      walk(node?.children);
      walk(node?.items);
    });
  };
  walk(menu);

  return links;
};
