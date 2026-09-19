import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
// `ru` экспортируется пакетом в рантайме (см. exports → ./locale), но TS при
// текущем moduleResolution не видит подпуть — берём через namespace + cast.
import * as rdpLocale from 'react-day-picker/locale';

import { cn } from '@/lib/cn';

const ru = (rdpLocale as Record<string, unknown>).ru;

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={ru as any}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-4',
        month_caption: 'flex h-9 items-center justify-center',
        caption_label: 'text-sm font-medium text-text-primary',
        // Навигация поверх подписи месяца: «назад» слева, «вперёд» справа.
        nav: 'absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between px-1',
        button_previous:
          'inline-flex h-7 w-7 items-center justify-center rounded-control text-text-secondary hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-40',
        button_next:
          'inline-flex h-7 w-7 items-center justify-center rounded-control text-text-secondary hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-xs font-normal text-text-muted',
        week: 'mt-1 flex w-full',
        day: 'h-9 w-9 p-0 text-center text-sm',
        day_button:
          'inline-flex h-9 w-9 items-center justify-center rounded-control font-normal text-text-primary hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
        // react-day-picker ставит класс `selected` на ячейку дня (td), поэтому
        // красим кнопку внутри неё: чернильная заливка, белый текст.
        selected:
          '[&>button]:bg-action [&>button]:text-action-fg [&>button]:hover:bg-action',
        today: '[&>button]:font-semibold',
        outside: 'text-text-muted opacity-50',
        disabled: 'text-text-muted opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chClassName, ...rest }: any) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('h-4 w-4', chClassName)} {...rest} />
          ) : (
            <ChevronRight className={cn('h-4 w-4', chClassName)} {...rest} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';
