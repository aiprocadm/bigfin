import * as React from 'react';

import { cn } from '@/lib/cn';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

/** Одна строка подсказки: как её отдаёт Recharts. */
interface TooltipEntry {
  name?: React.ReactNode;
  value?: number | string | null;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  // Заполняет Recharts.
  active?: boolean;
  payload?: TooltipEntry[];
  label?: React.ReactNode;
  /** Как печатать значение. По умолчанию — полная сумма организации. */
  formatValue?: (value: number, entry: TooltipEntry) => string;
  /** Как печатать заголовок подсказки (месяц, день). */
  formatLabel?: (label: React.ReactNode, payload: TooltipEntry[]) => React.ReactNode;
  /** Ряды, которые подсказка не показывает (служебные: «подставка» водопада). */
  hideKeys?: string[];
}

/**
 * Единая подсказка графиков (§6.1 ТЗ-4): период, полные суммы, цвет ряда.
 * На осях — «1,6 млн ₽», здесь — «1 612 400,00 ₽». Стиль всплывающего кита:
 * высота `elev-2`, радиус 12.
 *
 * Пустое значение (разрыв линии) не печатается «0 ₽»: нуля там не было.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatValue = (value) => formatOrganizationMoney(value),
  formatLabel,
  hideKeys = [],
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(
    (entry) =>
      entry.value !== null &&
      entry.value !== undefined &&
      !hideKeys.includes(String(entry.dataKey)),
  );
  if (rows.length === 0) return null;

  return (
    <div className="bigfin-ui min-w-40 rounded-default border border-border bg-surface px-3 py-2 text-footnote text-text-primary shadow-elev-2">
      {label !== undefined && label !== '' && (
        <div className="mb-1 text-text-secondary">{formatLabel ? formatLabel(label, rows) : label}</div>
      )}
      <ul className="flex flex-col gap-0.5">
        {rows.map((entry, index) => (
          <li key={`${entry.dataKey ?? index}`} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{entry.name}</span>
            <span className={cn('tabular-nums font-medium')}>{formatValue(Number(entry.value), entry)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
