import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import intl from 'react-intl-universal';
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  CalendarRange,
  FileText,
  Handshake,
  House,
  type LucideIcon,
  Settings,
  Users,
} from 'lucide-react';

import { Sidebar, type SidebarGroupData } from '@/components/ui/Sidebar';
import { SidebarMenu } from '@/constants/sidebarMenu';
import { useFeatureCan } from '@/hooks/state/feature';
import { useAbilityContext } from '@/hooks/utils';
import { useLocalStorage } from '@/hooks/utils/useLocalStorage';
import { useInterfaceMode } from '@/hooks/state/interfaceMode';
import { isAccountantOnlyHidden } from '@/constants/interfaceMode';
import { Features } from '@/constants/features';
import { ISidebarMenuItemType } from '@/containers/Dashboard/Sidebar/interfaces';
import { permissionAllows } from './permissionAllows';

// Файл был под `@ts-nocheck`; переписан под проверку типов в этапе 45 ТЗ-4,
// когда меню понадобились значки групп и свёрнутый режим.

interface MenuNode {
  text?: React.ReactNode;
  href?: string;
  type?: string;
  feature?: string;
  permission?: any;
  accountantOnly?: boolean;
  children?: MenuNode[];
}

interface Guards {
  featureCan: (feature: string) => boolean;
  ability: any;
  accountantOnlyHidden: boolean;
}

/** Ссылка меню в плоском виде — её же показывает командная строка. */
export interface NavLink {
  href: string;
  label: React.ReactNode;
}

/**
 * Значки групп для свёрнутого меню (UI-045-3 ТЗ-4). По ключу перевода
 * заголовка группы: порядок групп меню может меняться, смысл ключа — нет.
 */
const GROUP_ICONS: Record<string, LucideIcon> = {
  'sidebar.homepage': House,
  'sidebar.group.operations': ArrowLeftRight,
  'sidebar.reports': BarChart3,
  'sidebar.group.planning': CalendarRange,
  'sidebar.group.deals': Handshake,
  'sidebar.group.counterparties': Users,
  'sidebar.group.directories': BookOpen,
  'sidebar.preferences': Settings,
  'sidebar.group.documents': FileText,
};

/** Ключ перевода подписи пункта меню (`<T id="…" />`). */
export const menuTextId = (text: React.ReactNode): string | undefined =>
  React.isValidElement(text) ? (text.props as { id?: string }).id : undefined;

/** Подпись пункта меню строкой — для поиска и подсказок. */
export const menuTextString = (text: React.ReactNode): string => {
  if (typeof text === 'string') return text;
  const id = menuTextId(text);
  return id ? intl.get(id) : '';
};

// Формы создания (/new) в основную навигацию не выводим.
const isCreateRoute = (href: string) => /\/new(\/|$)/.test(href);

/**
 * Рекурсивно собирает все навигационные ссылки (с href) из ветки меню,
 * пропуская формы создания, дубли и модули с выключенным флагом.
 */
function collectLinks(
  node: MenuNode,
  acc: NavLink[],
  seen: Set<string>,
  guards: Guards,
) {
  const { featureCan, ability, accountantOnlyHidden } = guards;

  if (node?.href && !isCreateRoute(node.href) && !seen.has(node.href)) {
    seen.add(node.href);

    // Пункт выключенного модуля вёл на пустую белую страницу (страницы
    // модулей рендерят null без флага) — такие ссылки скрываем целиком.
    const featureOk = !node.feature || featureCan(node.feature);

    // Право на раздел: прежнее меню его проверяло, новое — потеряло, и
    // человеку показывали пункт, который ему закрыт (Л1 карты v34).
    const permissionOk = permissionAllows(ability, node.permission);

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
function buildNavGroups(guards: Guards): SidebarGroupData[] {
  return (SidebarMenu as MenuNode[])
    .map((top) => {
      const items: NavLink[] = [];
      collectLinks(top, items, new Set(), guards);
      const isStandalone = top.type === ISidebarMenuItemType.Link || !!top.href;
      const id = menuTextId(top.text);
      return {
        title: isStandalone ? undefined : top.text,
        titleText: menuTextString(top.text),
        icon: id ? GROUP_ICONS[id] : undefined,
        items: items.map((item) => ({
          ...item,
          labelText: menuTextString(item.label),
          icon: isStandalone && id ? GROUP_ICONS[id] : undefined,
        })),
      };
    })
    .filter((group) => group.items.length > 0);
}

/**
 * Группы меню с учётом модулей, прав и режима интерфейса. Их же читает
 * командная строка — «Перейти» не должна предлагать закрытое.
 */
export function useNavGroups(): SidebarGroupData[] {
  const { featureCan } = useFeatureCan();
  const ability = useAbilityContext();
  const mode = useInterfaceMode();
  const accountantOnlyHidden = isAccountantOnlyHidden(
    mode,
    featureCan(Features.InterfaceModes),
  );

  // Пересобираем меню, когда меняется набор включённых модулей, права или
  // режим интерфейса: любое из трёх меняет состав пунктов.
  const features = useSelector((state: any) => state.dashboard.features);
  return React.useMemo(
    () => buildNavGroups({ featureCan, ability, accountantOnlyHidden }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [features, ability, accountantOnlyHidden],
  );
}

/** Ключ запоминания свёрнутого меню. */
export const SIDEBAR_MINI_KEY = 'bigfin.sidebar.mini';

interface ConnectedSidebarProps {
  /**
   * Меню свёрнуто значками без выбора человека. Так на экранах настроек:
   * у них своё меню, и три колонки навигации рядом (O16 живого прохода)
   * съедали половину экрана (UI-045-5 ТЗ-4).
   */
  forceMini?: boolean;
}

export const ConnectedSidebar = ({ forceMini = false }: ConnectedSidebarProps) => {
  const location = useLocation();
  const history = useHistory();
  const groups = useNavGroups();
  // Свёрнутое меню запоминается: кто свернул его раз, хочет свёрнутым всегда.
  const [mini, setMini] = useLocalStorage(SIDEBAR_MINI_KEY, false);

  return (
    <Sidebar
      groups={groups}
      activeHref={location.pathname}
      mini={forceMini || !!mini}
      onToggleMini={forceMini ? undefined : () => setMini(!mini)}
      onItemClick={(item) => history.push(item.href)}
    />
  );
};
