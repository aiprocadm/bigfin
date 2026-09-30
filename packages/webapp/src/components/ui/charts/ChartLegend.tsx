import * as React from 'react';

import { cn } from '@/lib/cn';

export interface ChartLegendItem {
  key: string;
  label: React.ReactNode;
  color: string;
  /** Линия (пунктир/сплошная) или столбик — вид метки. */
  shape?: 'dot' | 'line';
}

export interface ChartLegendProps {
  items: ChartLegendItem[];
  hidden?: Set<string>;
  onToggle?: (key: string) => void;
  className?: string;
}

/**
 * Метки рядов под графиком (§6.1): кружок и подпись; нажатие прячет или
 * возвращает ряд. Скрытый ряд — бледный, но остаётся на месте: иначе метки
 * прыгали бы, и вернуть ряд было бы нечем.
 */
export function ChartLegend({ items, hidden, onToggle, className }: ChartLegendProps) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      {items.map((item) => {
        const off = hidden?.has(item.key) ?? false;
        const mark = (
          <span
            aria-hidden
            className={cn('inline-block shrink-0', item.shape === 'line' ? 'h-0.5 w-3 rounded-full' : 'h-2 w-2 rounded-full')}
            style={{ backgroundColor: item.color }}
          />
        );
        return (
          <li key={item.key}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => onToggle(item.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-control border-0 bg-transparent px-1 py-0.5 text-footnote transition-opacity',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
                  off ? 'text-text-muted opacity-50' : 'text-text-secondary',
                )}
              >
                {mark}
                {item.label}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-footnote text-text-secondary">
                {mark}
                {item.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Состояние скрытых рядов для легенды. */
export function useHiddenSeries() {
  const [hidden, setHidden] = React.useState<Set<string>>(() => new Set());
  const toggle = React.useCallback((key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  return { hidden, toggle };
}
