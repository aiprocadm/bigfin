import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/cn';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface ComboboxItem {
  value: string;
  label: string;
}

export interface ComboboxProps {
  items: ComboboxItem[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/**
 * Выпадающий список с поиском по вводу (searchable select).
 * Построен на Radix Popover + текстовый фильтр — без зависимости cmdk.
 */
export const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      items,
      value,
      onChange,
      placeholder,
      searchPlaceholder,
      emptyText,
      disabled,
      id,
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');

    const selected = items.find((item) => item.value === value);
    const filtered = query
      ? items.filter((item) =>
          item.label.toLowerCase().includes(query.toLowerCase()),
        )
      : items;

    const handleSelect = (next: string) => {
      onChange(next);
      setOpen(false);
      setQuery('');
    };

    return (
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'flex h-11 w-full items-center justify-between gap-2 rounded-control border border-border bg-surface-elevated px-3 py-2 text-sm sm:h-10',
              'focus:outline-none focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'text-text-primary' : 'text-text-muted',
              className,
            )}
          >
            <span className="line-clamp-1 text-left">
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-text-muted">
                {emptyText}
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleSelect(item.value)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm',
                    'hover:bg-surface-elevated focus:bg-surface-elevated focus:outline-none',
                    item.value === value ? 'text-text-primary' : 'text-text-secondary',
                  )}
                >
                  <span className="line-clamp-1">{item.label}</span>
                  {item.value === value ? (
                    <Check className="h-4 w-4 shrink-0 text-action" aria-hidden />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);
Combobox.displayName = 'Combobox';
