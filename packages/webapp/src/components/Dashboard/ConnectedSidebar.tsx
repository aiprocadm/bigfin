// @ts-nocheck
import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { Sidebar, type SidebarGroupData } from '@/components/ui/Sidebar';
import { SidebarMenu } from '@/constants/sidebarMenu';
import { useFeatureCan } from '@/hooks/state/feature';
import { useAbilityContext } from '@/hooks/utils';
import { useInterfaceMode } from '@/hooks/state/interfaceMode';
import { isAccountantOnlyHidden } from '@/constants/interfaceMode';
import { Features } from '@/constants/features';
import { ISidebarMenuItemType } from '@/containers/Dashboard/Sidebar/interfaces';

// Формы создания (/new) в основную навигацию не выводим.
const isCreateRoute = (href) => /\/new(\/|$)/.test(href);

/**
 * Рекурсивно собирает все навигационные ссылки (с href) из ветки меню,
 * пропуская формы создания, дубли и модули с выключенным флагом.
 */
function collectLinks(node, acc, seen, guards) {
  const { featureCan, ability, accountantOnlyHidden } = guards;

  if (node?.href && !isCreateRoute(node.href) && !seen.has(node.href)) {
    seen.add(node.href);

    // Пункт выключенного модуля вёл на пустую белую страницу (страницы
    // модулей рендерят null без флага) — такие ссылки скрываем целиком.
    const featureOk = !node.feature || featureCan(node.feature);

    // Право на раздел: прежнее меню его проверяло, новое — потеряло, и
    // человеку показывали пункт, который ему закрыт (Л1 карты v34).
    const permissionOk =
      !node.permission ||
      ability.can(node.permission.ability, node.permission.subject);

    // Режим «Бизнес» прячет чисто-бухгалтерские экраны, и маршрут уводит
    // с них на главную. Меню обязано знать то же правило — иначе шесть
    // пунктов молча возвращают человека на главную.
    const modeOk = !(node.accountantOnly && accountantOnlyHidden);

    if (featureOk && permissionOk && modeOk) {
      acc.push({ href: node.href, label: node.text });
    }
  }
  (node?.children || []).forEach((child) =>
    collectLinks(child, acc, seen, guards),
  );
}

/**
 * Строит секции навигации из полного меню SidebarMenu.
 * Раньше новый сайдбар показывал только 2 пункта, т.к. отбрасывал группы;
 * теперь каждая секция меню → группа со своими списочными экранами.
 */
function buildNavGroups(guards): SidebarGroupData[] {
  return SidebarMenu.map((top) => {
    const items = [];
    collectLinks(top, items, new Set(), guards);
    const isStandalone = top.type === ISidebarMenuItemType.Link || top.href;
    return { title: isStandalone ? undefined : top.text, items };
  }).filter((group) => group.items.length > 0);
}

export const ConnectedSidebar = () => {
  const location = useLocation();
  const history = useHistory();
  const { featureCan } = useFeatureCan();
  const ability = useAbilityContext();
  const mode = useInterfaceMode();
  const accountantOnlyHidden = isAccountantOnlyHidden(
    mode,
    featureCan(Features.InterfaceModes),
  );

  // Пересобираем меню, когда меняется набор включённых модулей, права или
  // режим интерфейса: любое из трёх меняет состав пунктов.
  const features = useSelector((state) => state.dashboard.features);
  const groups = React.useMemo(
    () => buildNavGroups({ featureCan, ability, accountantOnlyHidden }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [features, ability, accountantOnlyHidden],
  );

  return (
    <Sidebar
      groups={groups}
      activeHref={location.pathname}
      onItemClick={(item) => history.push(item.href)}
    />
  );
};
