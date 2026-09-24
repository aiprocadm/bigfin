import * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Группа переключателей (UI-044-8 ТЗ-4): несколько независимых «вкл/выкл»
 * рядом — «Доля от итога · Пустые строки · Переводы». Каждая кнопка —
 * `aria-pressed`: экранный диктор говорит «нажата / не нажата». Для выбора
 * одного из нескольких — `SegmentedControl`.
 */
export interface ToggleOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface ToggleGroupProps<T extends string = string> {
  options: ToggleOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  'aria-label': string;
  className?: string;
}

export function ToggleGroup<T extends string = string>({
  options,
  value,
  onChange,
  className,
  ...rest
}: ToggleGroupProps<T>) {
  const toggle = (item: T) =>
    onChange(value.includes(item) ? value.filter((entry) => entry !== item) : [...value, item]);

  return (
    <div role="group" aria-label={rest['aria-label']} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((option) => {
        const pressed = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            disabled={option.disabled}
            onClick={() => toggle(option.value)}
            className={cn(
              'inline-flex h-8 items-center rounded-full border px-3 text-subhead font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-40',
              pressed
                ? 'border-action bg-action text-action-fg'
                : 'border-border bg-surface text-text-secondary hover:bg-fill-1 hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
