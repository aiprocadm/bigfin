import * as React from 'react';
import intl from 'react-intl-universal';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface SidebarItemData {
  href: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  active?: boolean;
  /** Число рядом с пунктом: сколько дел ждёт. Ноль и пустота не показываются. */
  count?: number | null;
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
      aria-label={intl.get('sidebar.aria_label')}
      className={cn(
        'flex h-full flex-col overflow-y-auto border-r border-border bg-surface-elevated py-3 transition-[width] duration-200',
        mini ? 'w-16' : 'w-60',
        className,
      )}
    >
      {resolvedGroups.map((group, gi) => (
        <div
          key={gi}
          className={cn(
            'flex flex-col gap-0.5',
            // Секции разделяются волосяной линией и воздухом, а не
            // заголовком ПРОПИСНЫМИ вразрядку: такой заголовок кричит
            // громче самих пунктов, ради которых он и стоит.
            gi > 0 && 'mt-3 border-t border-border pt-3',
          )}
        >
          {group.title && !mini && (
            <div className="mx-2 mb-1 px-3 text-[0.8125rem] font-medium text-text-muted">
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

  // Ноль дел — это не «дело», и показывать его нечестно: пустой счётчик
  // выглядит так же, как непрочитанное, и заставляет открывать зря.
  const count = item.count && item.count > 0 ? item.count : null;

  return (
    <a
      href={item.href}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      title={mini && typeof item.label === 'string' ? item.label : undefined}
      className={cn(
        // На телефоне пункт не ниже 44 px: палец накрывает примерно
        // сантиметр, а пункты идут вплотную — промах уводит в соседний
        // раздел. На больших экранах ограничение снимается, там указатель
        // точный и лишняя высота удлиняла бы список без пользы.
        'relative mx-2 flex min-h-11 items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors md:min-h-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
        active
          ? 'bg-surface font-semibold text-text-primary'
          : 'font-medium text-text-secondary hover:bg-surface hover:text-text-primary',
        mini && 'justify-center',
      )}
    >
      {/* Текущий раздел отмечен полосой у самого края панели, а не точкой
          справа: полоса видна и в узком режиме, где подписи нет вовсе. */}
      {active && (
        <span
          aria-hidden
          className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent"
        />
      )}
      {Icon && <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" aria-hidden />}
      {!mini && <span className="truncate">{item.label}</span>}
      {!mini && count !== null && (
        <span className="money ml-auto min-w-5 rounded-full bg-surface px-1.5 text-xs font-semibold leading-5 text-text-secondary">
          {count}
        </span>
      )}
    </a>
  );
};
