import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatOrganizationDate } from '@/utils/organizationDate';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Выберите дату',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-11 w-full items-center gap-2 rounded-control border border-border bg-surface-elevated px-3 text-left text-sm sm:h-10',
            'focus:outline-none focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action',
            'disabled:cursor-not-allowed disabled:opacity-50',
            value ? 'text-text-primary' : 'text-text-muted',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          {/* Дата печатается по формату организации, а не зашитым
              «ДД.ММ.ГГГГ» (Ж1 карты v32): организация может выбрать
              другой формат в настройках, и списки рядом печатают именно
              его. */}
          {value ? formatOrganizationDate(value) : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
