import * as React from 'react';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface SidebarItemData {
  href: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  active?: boolean;
}

export interface SidebarGroupData {
  /** Заголовок секции (необязательный — пункты без секции рендерятся без него). */
  title?: React.ReactNode;
  items: SidebarItemData[];
}

interface SidebarProps {
  /** Плоский список пунктов (простой режим). */
  items?: SidebarItemData[];
  /** Группированная навигация по секциям (приоритетнее items, если задана). */
  groups?: SidebarGroupData[];
  activeHref?: string;
  mini?: boolean;
  onItemClick?: (item: SidebarItemData) => void;
  className?: string;
}

export const Sidebar = ({
  items,
  groups,
  activeHref,
  mini = false,
  onItemClick,
  className,
}: SidebarProps) => {
  // Если переданы группы — рендерим их; иначе плоский список как одну секцию.
  const resolvedGroups: SidebarGroupData[] =
    groups ?? (items ? [{ items }] : []);

  return (
    <nav
      aria-label="Главное меню"
      className={cn(
        'flex h-full flex-col gap-4 overflow-y-auto border-r border-border bg-background py-4 transition-[width] duration-200',
        mini ? 'w-16' : 'w-60',
        className,
      )}
    >
      {resolvedGroups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.title && !mini && (
            <div className="mx-3 mb-1 px-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              {group.title}
            </div>
          )}
          {group.items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              active={item.href === activeHref || item.active}
              mini={mini}
              onClick={onItemClick}
            />
          ))}
        </div>
      ))}
    </nav>
  );
};

interface SidebarItemProps {
  item: SidebarItemData;
  active?: boolean;
  mini?: boolean;
  onClick?: (item: SidebarItemData) => void;
}

const SidebarItem = ({ item, active, mini, onClick }: SidebarItemProps) => {
  const Icon = item.icon;
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.(item);
  };

  return (
    <a
      href={item.href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'mx-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-surface text-text-primary font-semibold'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary',
        mini && 'justify-center',
      )}
      title={mini ? undefined : undefined}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      {!mini && <span className="truncate">{item.label}</span>}
      {!mini && active && (
        <span
          className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"
          aria-hidden
        />
      )}
    </a>
  );
};
