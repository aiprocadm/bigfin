import * as React from 'react';
import intl from 'react-intl-universal';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatDateRange } from '@/utils/formatShortDate';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import {
  DATE_RANGE_PRESETS,
  type DateRange,
  type DateRangePreset,
  matchPreset,
  normalizeRange,
  presetRange,
  shiftRange,
} from './date-range';
import { useIsPhone } from './use-media-query';

/**
 * Период одним полем — «1–30 сент. 2026 г.» (UI-044-2 ТЗ-4).
 *
 * Было два поля «с» и «по» и ряд кнопок «Этот месяц · Прошлый месяц …» —
 * три строки на ноутбуке и полэкрана на телефоне. Теперь одно поле: стрелки
 * ‹ › сдвигают период на его длину (месяц — на месяц), по нажатию —
 * готовые варианты и календарь. На телефоне календарь — один месяц.
 */
export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** «Сегодня» для готовых вариантов; по умолчанию — местная дата. */
  today?: string;
  presets?: DateRangePreset[];
  /** Стрелки сдвига периода по бокам поля. */
  showArrows?: boolean;
  className?: string;
}

const localToday = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const toDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export function DateRangePicker({
  value,
  onChange,
  today = localToday(),
  presets = DATE_RANGE_PRESETS,
  showArrows = true,
  className,
}: DateRangePickerProps) {
  const isPhone = useIsPhone();
  const [open, setOpen] = React.useState(false);
  // Черновик: первый щелчок по календарю ставит начало, второй — конец.
  const [draft, setDraft] = React.useState<{ from: Date } | undefined>();
  const active = matchPreset(value, today);

  const apply = (range: DateRange) => {
    onChange(normalizeRange(range));
    setOpen(false);
    setDraft(undefined);
  };

  const arrow = (direction: 1 | -1) => (
    <button
      type="button"
      onClick={() => onChange(shiftRange(value, direction))}
      aria-label={intl.get(direction === 1 ? 'date_range.next' : 'date_range.previous')}
      className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-control text-text-secondary hover:bg-fill-1 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
    >
      {direction === 1 ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
    </button>
  );

  return (
    <div className={cn('inline-flex max-w-full items-center gap-0.5', className)}>
      {showArrows && arrow(-1)}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setDraft(undefined);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${intl.get('date_range.choose')}: ${formatDateRange(value.from, value.to)}`}
            className={cn(
              'flex h-10 min-w-0 items-center gap-2 rounded-control border border-border bg-surface px-3 text-left text-body text-text-primary',
              'hover:bg-fill-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
            <span className="truncate tabular-nums">{formatDateRange(value.from, value.to)}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <div className="flex flex-col sm:flex-row">
            <ul className="flex gap-1 overflow-x-auto border-b border-border p-2 sm:w-44 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
              {presets.map((preset) => (
                <li key={preset} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active === preset}
                    onClick={() => apply(presetRange(preset, today))}
                    className={cn(
                      'w-full whitespace-nowrap rounded-control px-3 py-2 text-left text-body',
                      'hover:bg-fill-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
                      active === preset ? 'bg-fill-2 font-medium text-text-primary' : 'text-text-secondary',
                    )}
                  >
                    {intl.get(`date_range.preset.${preset}`)}
                  </button>
                </li>
              ))}
            </ul>
            <Calendar
              mode="range"
              numberOfMonths={isPhone ? 1 : 2}
              defaultMonth={toDate(value.from)}
              selected={
                draft
                  ? { from: draft.from, to: undefined }
                  : { from: toDate(value.from), to: toDate(value.to) }
              }
              // Берём саму нажатую дату, а не «достроенный» календарём период:
              // первый щелчок — начало, второй — конец (раньше начала — меняются
              // местами). Иначе первый щелчок при уже выбранном периоде
              // расширял старый период вместо того, чтобы начать новый.
              onSelect={(_range: unknown, day: Date) => {
                if (draft?.from) {
                  apply({ from: toIso(draft.from), to: toIso(day) });
                  return;
                }
                setDraft({ from: day });
              }}
              classNames={{
                selected: '',
                range_start: '[&>button]:bg-action [&>button]:text-action-fg',
                range_end: '[&>button]:bg-action [&>button]:text-action-fg',
                range_middle: 'bg-fill-1 [&>button]:rounded-none',
              }}
            />
          </div>
        </PopoverContent>
      </Popover>
      {showArrows && arrow(1)}
    </div>
  );
}
