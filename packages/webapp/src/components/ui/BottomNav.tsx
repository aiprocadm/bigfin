import * as React from 'react';
import { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Переход по адресу. Для действия (например, «Добавить») — пусто. */
  href?: string;
  onClick?: () => void;
  /** Выделенное действие в середине панели. Ровно одно. */
  emphasis?: boolean;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeHref?: string;
  onNavigate?: (href: string) => void;
  className?: string;
  ariaLabel: string;
}

/**
 * Нижняя панель — навигация на телефоне.
 *
 * ЗАЧЕМ. Раньше на телефоне было только «три полоски»: любое действие стоило
 * двух касаний, и первое из них — открыть список из сорока пунктов. Владелец
 * заходит с телефона за одним и тем же: посмотреть деньги, разнести вчерашние
 * операции, записать приход или расход. Эти дела вынесены в один тап.
 *
 * Панель показывается только на узких экранах: на большом экране боковое меню
 * и удобнее, и вмещает всё.
 *
 * Отступ снизу учитывает «безопасную зону» — полосу жеста внизу современных
 * телефонов. Без него нижний ряд кнопок попадает под неё и не нажимается.
 */
export const BottomNav = ({
  items,
  activeHref,
  onNavigate,
  className,
  ariaLabel,
}: BottomNavProps) => (
  <nav
    aria-label={ariaLabel}
    className={cn(
      'fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface md:hidden',
      'pb-[env(safe-area-inset-bottom)]',
      className,
    )}
  >
    {items.map((item) => {
      const Icon = item.icon;
      const active = !!item.href && item.href === activeHref;

      return (
        <button
          key={item.key}
          type="button"
          aria-current={active ? 'page' : undefined}
          onClick={() => {
            if (item.onClick) return item.onClick();
            if (item.href) onNavigate?.(item.href);
          }}
          className={cn(
            // 56 px высоты: палец накрывает примерно сантиметр, и пять целей
            // в ряд должны надёжно различаться.
            // `border-0` задан явно: сброс полей внутри `.bigfin-ui` убирает
            // фон кнопки, но не рамку, и в окружении без общего сброса
            // браузер рисует свою — панель распадается на пять коробочек.
            'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 border-0 bg-transparent px-1 py-2',
            'text-[0.6875rem] font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-action',
            active ? 'text-text-primary' : 'text-text-secondary',
          )}
        >
          {item.emphasis ? (
            // Выделенное действие: заливка чернилами. Ровно одно на панели —
            // иначе выделение перестаёт что-либо значить.
            // Плашка ТОЙ ЖЕ высоты, что значок у соседей: выше — и подпись
            // съезжает вниз, а ряд перестаёт читаться одной строкой.
            <span className="flex h-5 w-10 items-center justify-center rounded-control bg-action text-action-fg">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : (
            <Icon
              className={cn('h-5 w-5', active && 'text-text-primary')}
              aria-hidden
            />
          )}
          <span className="max-w-full truncate">{item.label}</span>
        </button>
      );
    })}
  </nav>
);
