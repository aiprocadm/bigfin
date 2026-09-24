import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Радиокнопки (UI-044-8 ТЗ-4): выбор одного варианта с пояснением под
 * каждым — «Как считать прибыль: по деньгам / по начислению». Для коротких
 * вариантов в одну строку лучше `SegmentedControl`.
 *
 * Стрелки двигают выбор, Tab заходит в группу одной остановкой.
 */
export interface RadioOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string = string> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  className?: string;
}

export function RadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: RadioGroupProps<T>) {
  const ref = React.useRef<HTMLDivElement>(null);
  const enabled = options.filter((option) => !option.disabled);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1
      : ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 0;
    if (!step || enabled.length === 0) return;
    event.preventDefault();
    const index = enabled.findIndex((option) => option.value === value);
    const next = enabled[(index + step + enabled.length) % enabled.length];
    onChange(next.value);
    Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])
      .find((node) => node.dataset.value === next.value)
      ?.focus();
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn('flex flex-col gap-1', className)}
    >
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
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex items-start gap-3 rounded-control px-2 py-2 text-left',
              'hover:bg-fill-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                selected ? 'border-action bg-action' : 'border-border bg-surface',
              )}
            >
              {selected && <span className="h-1.5 w-1.5 rounded-full bg-action-fg" />}
            </span>
            <span className="min-w-0">
              <span className="block text-body text-text-primary">{option.label}</span>
              {option.description && (
                <span className="block text-subhead text-text-secondary">{option.description}</span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
