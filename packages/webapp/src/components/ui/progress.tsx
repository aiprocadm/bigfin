import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { uiLocale } from '@/utils/formatShortDate';

/**
 * Кольца и полоса выполнения (UI-044-5 ТЗ-4).
 *
 * Кольца — в духе Apple Watch (R19): до трёх концентрических, «идём ли по
 * плану» читается за секунду. Нет плана — кольцо пустое и подписано «нет
 * плана»: процент к нулевому плану не показывается нигде в продукте.
 * Перевыполнение рисуется полным кольцом, а в подписи честно «112 %».
 */
export type ChartTone = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'chart-6' | 'chart-7' | 'chart-8';

const STROKE: Record<ChartTone, string> = {
  'chart-1': 'stroke-chart-1',
  'chart-2': 'stroke-chart-2',
  'chart-3': 'stroke-chart-3',
  'chart-4': 'stroke-chart-4',
  'chart-5': 'stroke-chart-5',
  'chart-6': 'stroke-chart-6',
  'chart-7': 'stroke-chart-7',
  'chart-8': 'stroke-chart-8',
};
const FILL: Record<ChartTone, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
  'chart-6': 'bg-chart-6',
  'chart-7': 'bg-chart-7',
  'chart-8': 'bg-chart-8',
};

/** Доля в процентах словами: «56 %»; нет плана — «нет плана». */
export function formatShare(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return intl.get('progress.no_plan');
  return `${new Intl.NumberFormat(uiLocale(), { maximumFractionDigits: 0 }).format(value * 100)} %`;
}

export interface ProgressRingItem {
  label: string;
  /** Доля выполнения: 0.56 — 56 %; `null` — плана нет. */
  value: number | null;
  tone: ChartTone;
}

export interface ProgressRingProps {
  rings: ProgressRingItem[];
  size?: number;
  /** Что написать в центре: главная цифра. */
  children?: React.ReactNode;
  className?: string;
  /**
   * Толщина кольца. По умолчанию — от размера, но не тоньше 8: так кольцо
   * читается на главной. Маленькому кольцу в шапке (UI-045-6) нужна тоньше,
   * иначе от него остаётся сплошной кружок.
   */
  thickness?: number;
}

export function ProgressRing({ rings, size = 120, children, className, thickness }: ProgressRingProps) {
  const shown = rings.slice(0, 3);
  const stroke = thickness ?? Math.max(8, Math.round(size / 11));
  const gap = 2;
  const summary = shown.map((ring) => `${ring.label}: ${formatShare(ring.value)}`).join(', ');

  return (
    <div
      role="img"
      aria-label={summary}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {shown.map((ring, index) => {
          const radius = size / 2 - stroke / 2 - index * (stroke + gap);
          const length = 2 * Math.PI * radius;
          const share = ring.value === null ? 0 : Math.max(0, Math.min(1, ring.value));
          return (
            <g key={ring.label}>
              <title>{`${ring.label}: ${formatShare(ring.value)}`}</title>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth={stroke}
                className={cn(STROKE[ring.tone], 'opacity-15')}
              />
              {share > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${share * length} ${length}`}
                  className={cn(STROKE[ring.tone], 'transition-[stroke-dasharray] duration-320 ease-standard')}
                />
              )}
            </g>
          );
        })}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

export interface ProgressBarProps {
  label: string;
  /** Доля выполнения; `null` — плана нет. */
  value: number | null;
  /** Сколько должно быть к сегодня (доля прошедшего времени) — отметка на полосе. */
  expected?: number | null;
  tone?: ChartTone;
  className?: string;
}

export function ProgressBar({ label, value, expected, tone = 'chart-1', className }: ProgressBarProps) {
  const share = value === null ? 0 : Math.max(0, Math.min(1, value));
  const marker = expected == null ? null : Math.max(0, Math.min(1, expected));

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between gap-2 text-subhead">
        <span className="text-text-secondary">{label}</span>
        <span className="tabular-nums text-text-primary">{formatShare(value)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(value * 100)}
        aria-valuetext={formatShare(value)}
        className="relative h-2 overflow-visible rounded-full bg-fill-1"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-320 ease-standard', FILL[tone])}
          style={{ width: `${share * 100}%` }}
        />
        {marker !== null && (
          <span
            data-testid="progress-expected"
            title={`${intl.get('progress.expected')}: ${formatShare(expected ?? null)}`}
            className="absolute -top-1 h-4 w-0.5 rounded-full bg-text-primary"
            style={{ left: `calc(${marker * 100}% - 1px)` }}
          />
        )}
      </div>
    </div>
  );
}
