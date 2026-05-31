import * as React from 'react';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface SidebarItemData {
  href: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
}

interface SidebarProps {
  items: SidebarItemData[];
  activeHref?: string;
  mini?: boolean;
  onItemClick?: (item: SidebarItemData) => void;
  className?: string;
}

export const Sidebar = ({
  items,
  activeHref,
  mini = false,
  onItemClick,
  className,
}: SidebarProps) => {
  return (
    <nav
      aria-label="Главное меню"
      className={cn(
        'flex h-full flex-col gap-1 border-r border-border bg-background py-4 transition-[width] duration-200',
        mini ? 'w-16' : 'w-60',
        className,
      )}
    >
      {items.map((item) => (
        <SidebarItem
          key={item.href}
          item={item}
          active={item.href === activeHref || item.active}
          mini={mini}
          onClick={onItemClick}
        />
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
          ? 'bg-accent/10 text-accent'
          : 'text-text-secondary hover:bg-surface hover:text-text-primary',
        mini && 'justify-center',
      )}
      title={mini ? item.label : undefined}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      {!mini && <span className="truncate">{item.label}</span>}
    </a>
  );
};
