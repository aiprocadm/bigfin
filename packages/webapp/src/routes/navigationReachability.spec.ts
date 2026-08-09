// © 2026 Bigfin
import { getDashboardRoutes } from './dashboard';
import { SidebarMenu } from '@/constants/sidebarMenu';
import { PreferencesMenu } from '@/constants/preferencesMenu';
import {
  collectMenuLinks,
  collectModuleRoutes,
  UNLINKED_MODULE_ROUTES,
} from './navigationReachability';

/**
 * Страховка от самого частого дефекта проекта: страница модуля есть, а попасть
 * на неё кликом нельзя. Такое случалось шесть раз подряд (приёмка #185 нашла
 * сразу 12 недостижимых страниц), и причина всегда одна — пункт меню забыли
 * добавить вместе со страницей.
 *
 * Тест сверяет корневые страницы модулей с пунктами меню. Вложенные страницы
 * (`/invoices/new`, `/items/import`) сюда не входят: на них попадают со своей
 * же корневой страницы.
 */
describe('навигация: у каждого модуля есть пункт меню', () => {
  const routes = collectModuleRoutes(getDashboardRoutes());
  const links = collectMenuLinks([...SidebarMenu, ...PreferencesMenu]);

  it('корневые страницы модулей найдены', () => {
    // Если разбор маршрутов сломается, тест ниже станет зелёным «бесплатно».
    expect(routes.length).toBeGreaterThan(30);
    expect(links.size).toBeGreaterThan(30);
  });

  it('каждая корневая страница достижима кликом', () => {
    const unreachable = routes.filter(
      (route) => !links.has(route) && !UNLINKED_MODULE_ROUTES.has(route),
    );

    expect(unreachable).toEqual([]);
  });

  it('в списке исключений нет лишнего: все они всё ещё существуют', () => {
    // Иначе исключение переживёт саму страницу и тихо ослабит проверку.
    const stale = [...UNLINKED_MODULE_ROUTES].filter(
      (route) => !routes.includes(route),
    );

    expect(stale).toEqual([]);
  });

  it('верхний уровень меню не разрастается плоским списком', () => {
    // Меню уже разрасталось: после «Отчётов» подряд шло больше двадцати
    // самостоятельных пунктов, и найти нужный можно было только перебором.
    // Новый раздел должен попадать в группу, а не в общий хвост.
    const topLevelLinks = SidebarMenu.filter(
      (item: any) => !item.children?.length,
    );

    expect(topLevelLinks.length).toBeLessThanOrEqual(3);
  });

  it('исключения не дублируют пункты меню', () => {
    // Страница попала в меню — значит, её место не в списке исключений.
    const redundant = [...UNLINKED_MODULE_ROUTES].filter((route) =>
      links.has(route),
    );

    expect(redundant).toEqual([]);
  });
});
