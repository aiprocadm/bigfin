// @ts-nocheck
import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { Sidebar, type SidebarGroupData } from '@/components/ui/Sidebar';
import { SidebarMenu } from '@/constants/sidebarMenu';
import { useFeatureCan } from '@/hooks/state/feature';
import { ISidebarMenuItemType } from '@/containers/Dashboard/Sidebar/interfaces';

// Формы создания (/new) в основную навигацию не выводим.
const isCreateRoute = (href) => /\/new(\/|$)/.test(href);

/**
 * Рекурсивно собирает все навигационные ссылки (с href) из ветки меню,
 * пропуская формы создания, дубли и модули с выключенным флагом.
 */
function collectLinks(node, acc, seen, featureCan) {
  if (node?.href && !isCreateRoute(node.href) && !seen.has(node.href)) {
    seen.add(node.href);
    // Пункт выключенного модуля вёл на пустую белую страницу (страницы
    // модулей рендерят null без флага) — такие ссылки скрываем целиком.
    if (!node.feature || featureCan(node.feature)) {
      acc.push({ href: node.href, label: node.text });
    }
  }
  (node?.children || []).forEach((child) =>
    collectLinks(child, acc, seen, featureCan),
  );
}

/**
 * Строит секции навигации из полного меню SidebarMenu.
 * Раньше новый сайдбар показывал только 2 пункта, т.к. отбрасывал группы;
 * теперь каждая секция меню → группа со своими списочными экранами.
 */
function buildNavGroups(featureCan): SidebarGroupData[] {
  return SidebarMenu.map((top) => {
    const items = [];
    collectLinks(top, items, new Set(), featureCan);
    const isStandalone = top.type === ISidebarMenuItemType.Link || top.href;
    return { title: isStandalone ? undefined : top.text, items };
  }).filter((group) => group.items.length > 0);
}

export const ConnectedSidebar = () => {
  const location = useLocation();
  const history = useHistory();
  const { featureCan } = useFeatureCan();
  // Пересобираем меню только когда меняется набор включённых модулей.
  const features = useSelector((state) => state.dashboard.features);
  const groups = React.useMemo(
    () => buildNavGroups(featureCan),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [features],
  );

  return (
    <Sidebar
      groups={groups}
      activeHref={location.pathname}
      onItemClick={(item) => history.push(item.href)}
    />
  );
};
