// @ts-nocheck
import { useHistory, useLocation } from 'react-router-dom';

import { Sidebar, type SidebarGroupData } from '@/components/ui/Sidebar';
import { SidebarMenu } from '@/constants/sidebarMenu';
import { ISidebarMenuItemType } from '@/containers/Dashboard/Sidebar/interfaces';

// Формы создания (/new) в основную навигацию не выводим.
const isCreateRoute = (href: string) => /\/new(\/|$)/.test(href);

/**
 * Рекурсивно собирает все навигационные ссылки (с href) из ветки меню,
 * пропуская формы создания и дубли.
 */
function collectLinks(node, acc, seen) {
  if (node?.href && !isCreateRoute(node.href) && !seen.has(node.href)) {
    seen.add(node.href);
    acc.push({ href: node.href, label: node.text });
  }
  (node?.children || []).forEach((child) => collectLinks(child, acc, seen));
}

/**
 * Строит секции навигации из полного меню SidebarMenu.
 * Раньше новый сайдбар показывал только 2 пункта, т.к. отбрасывал группы;
 * теперь каждая секция меню → группа со своими списочными экранами.
 */
function buildNavGroups(): SidebarGroupData[] {
  return SidebarMenu.map((top) => {
    const items = [];
    collectLinks(top, items, new Set());
    const isStandalone = top.type === ISidebarMenuItemType.Link || top.href;
    return { title: isStandalone ? undefined : top.text, items };
  }).filter((group) => group.items.length > 0);
}

const NAV_GROUPS = buildNavGroups();

export const ConnectedSidebar = () => {
  const location = useLocation();
  const history = useHistory();

  return (
    <Sidebar
      groups={NAV_GROUPS}
      activeHref={location.pathname}
      onItemClick={(item) => history.push(item.href)}
    />
  );
};
