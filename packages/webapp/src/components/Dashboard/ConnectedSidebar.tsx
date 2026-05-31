// @ts-nocheck — useMainSidebarMenu и interfaces — легаси JS без типов
import { useHistory, useLocation } from 'react-router-dom';

import { Sidebar, type SidebarItemData } from '@/components/ui/Sidebar';
import { useMainSidebarMenu } from '@/containers/Dashboard/Sidebar/hooks';
import { ISidebarMenuItemType } from '@/containers/Dashboard/Sidebar/interfaces';

export const ConnectedSidebar = () => {
  const legacyMenu = useMainSidebarMenu();
  const location = useLocation();
  const history = useHistory();

  // Преобразуем легаси-меню (уже плоское после useFlatSidebarMenu) в
  // формат SidebarItemData. В Phase 3 поддерживаем только Link-тип; метка
  // берётся из `text` (string | JSX) — поле `label` в легаси отсутствует.
  // Overlay/Dialog/Group/Drawer в этой волне не отображаются (см. спеку:
  // mapping BP-icon→Lucide и submenu — отдельный sub-project).
  const items: SidebarItemData[] = (legacyMenu || [])
    .filter((item) => item.type === ISidebarMenuItemType.Link && item.href)
    .map((item) => ({
      href: item.href,
      label: item.text,
    }));

  return (
    <Sidebar
      items={items}
      activeHref={location.pathname}
      onItemClick={(item) => history.push(item.href)}
    />
  );
};
