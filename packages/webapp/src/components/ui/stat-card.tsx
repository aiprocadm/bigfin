import * as React from 'react';
import intl from 'react-intl-universal';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/cn';
import { uiLocale } from '@/utils/formatShortDate';
import { Skeleton } from './skeleton';
import { Sparkline } from './sparkline';

/**
 * Карточка-показатель (UI-044-4 ТЗ-4): подпись, число, изменение к базе,
 * искорка.
 *
 * Изменение подчиняется правилам продукта:
 * - нет базы — процента нет, пишется «нет базы для сравнения» (не «+100 %»
 *   из ничего, как у конкурента);
 * - рост не всегда хорошо: у расходов хорошо — снижение;
 * - ноль — не новость, не красится;
 * - плохое изменение — спокойным серым, а не красным: красный — только
 *   проблема (просрочка, разрыв).
 */
export type StatSense = 'income' | 'expense' | 'neutral';

export interface StatCardProps {
  label: React.ReactNode;
  /** Готовое число: сумма через общую утилиту денег, процент, штуки. */
  value: React.ReactNode | null;
  /** Изменение к базе в процентах; `null` — базы нет. */
  changePercent?: number | null;
  /** К чему сравнение: «к августу». */
  changeLabel?: React.ReactNode;
  sense?: StatSense;
  sparkline?: Array<number | null>;
  loading?: boolean;
  className?: string;
}

/** Хорошее ли изменение для этого вида показателя. Ноль — не хорошее. */
export function isGoodChange(sense: StatSense, percent: number): boolean {
  if (percent === 0 || sense === 'neutral') return false;
  return sense === 'expense' ? percent < 0 : percent > 0;
}

const formatChange = (percent: number) =>
  `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${new Intl.NumberFormat(uiLocale(), {
    maximumFractionDigits: 1,
  }).format(Math.abs(percent))} %`;

export function StatCard({
  label,
  value,
  changePercent,
  changeLabel,
  sense = 'neutral',
  sparkline,
  loading = false,
  className,
}: StatCardProps) {
  return (
    <div className={cn('flex flex-col gap-1 rounded-default border border-border bg-surface p-4', className)}>
      <span className="text-subhead text-text-secondary">{label}</span>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <span className="text-title-2 tabular-nums text-text-primary">
          {value ?? <span className="text-body text-text-muted">{intl.get('stat_card.no_data')}</span>}
        </span>
      )}
      {!loading && changePercent !== undefined && (
        <span className="flex items-center gap-1 text-footnote">
          {changePercent === null ? (
            <span className="text-text-muted">{intl.get('stat_card.no_base')}</span>
          ) : (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-medium',
                  isGoodChange(sense, changePercent) ? 'text-success' : 'text-text-secondary',
                )}
              >
                {changePercent > 0 && <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />}
                {changePercent < 0 && <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
                {formatChange(changePercent)}
              </span>
              {changeLabel && <span className="text-text-muted">{changeLabel}</span>}
            </>
          )}
        </span>
      )}
      {!loading && sparkline && sparkline.length > 1 && (
        <Sparkline
          points={sparkline.map((point, index) => ({ label: String(index + 1), value: point }))}
          width={120}
          height={24}
        />
      )}
    </div>
  );
}
