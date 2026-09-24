import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Сегментный переключатель в духе iOS (UI-044-1 ТЗ-4).
 *
 * Выбор одного из нескольких видов: период «Месяц / Квартал / Год», тип
 * «Все / Приход / Расход». Дорожка — заливка `fill-1`, выбранный сегмент —
 * белая «пилюля» с тенью `elev-1`, которая переезжает к нажатому.
 *
 * Для экранного диктора это группа радиокнопок: стрелки ← → двигают выбор,
 * Tab заходит в группу одной остановкой. Больше пяти сегментов не
 * сжимаются, а листаются вбок.
 */
export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Подпись группы для экранного диктора. */
  'aria-label': string;
  size?: 'sm' | 'md';
  /** Растянуть на всю ширину, сегменты поровну (телефон). */
  fullWidth?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [pill, setPill] = React.useState<{ left: number; width: number } | null>(null);

  // «Пилюля» встаёт под выбранный сегмент и переезжает при смене выбора.
  const measure = React.useCallback(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    setPill(active ? { left: active.offsetLeft, width: active.offsetWidth } : null);
  }, []);

  React.useLayoutEffect(measure, [measure, value, options.length]);
  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined' || !listRef.current) return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const enabled = options.filter((option) => !option.disabled);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step || enabled.length === 0) return;
    event.preventDefault();
    const index = enabled.findIndex((option) => option.value === value);
    const next = enabled[(index + step + enabled.length) % enabled.length];
    onChange(next.value);
    Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])
      .find((node) => node.dataset.value === next.value)
      ?.focus();
  };

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn(
        'relative inline-flex max-w-full items-stretch gap-0.5 overflow-x-auto rounded-full bg-fill-1 p-0.5',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      {pill && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0.5 top-0.5 rounded-full bg-surface shadow-elev-1 transition-[left,width] duration-220 ease-spring"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-value={option.value}
            disabled={option.disabled}
            // Табом в группу — одна остановка, на выбранном сегменте.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
              'disabled:pointer-events-none disabled:opacity-40',
              size === 'sm' ? 'h-7 px-3 text-subhead' : 'h-8 px-3.5 text-body',
              fullWidth && 'flex-1',
              selected ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
