import * as React from 'react';
import intl from 'react-intl-universal';
import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

import {
  QUICK_PERIODS,
  ReportRange,
  formatRangeLabel,
  matchQuickPeriod,
  reportRange,
} from './reportPeriod';

export interface ReportPeriodBarProps {
  /** Текущий отрезок отчёта. */
  range: Partial<ReportRange> | null | undefined;
  onRangeChange: (range: ReportRange) => void;
  /** Открыть панель остальных настроек отчёта. */
  onCustomizeClick?: () => void;
  /** Что показать справа: переключатель метода учёта и подобное. */
  extraSlot?: React.ReactNode;
  className?: string;
}

/**
 * Полоса периода отчёта.
 *
 * ЗАЧЕМ. Период меняют чаще, чем всё остальное в отчёте вместе взятое, а жил
 * он внутри панели «Настроить отчёт»: открыть панель → выбрать даты →
 * применить → закрыть. Четыре действия там, где нужно одно.
 *
 * Здесь шесть готовых периодов и подпись текущего отрезка. Произвольные даты
 * остаются в панели настроек — они нужны редко, и тащить календарь в полосу
 * значит менять частую задачу на редкую.
 *
 * Когда отрезок произвольный, НИ ОДНА кнопка не выглядит нажатой: нажатая
 * кнопка обещала бы, что показан именно её период.
 */
export const ReportPeriodBar = ({
  range,
  onRangeChange,
  onCustomizeClick,
  extraSlot,
  className,
}: ReportPeriodBarProps) => {
  const active = matchQuickPeriod(range);
  const label = formatRangeLabel(
    range,
    intl.getInitOptions?.()?.currentLocale || 'ru',
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label={intl.get('report_period.aria_label')}
        >
          {QUICK_PERIODS.map(({ kind, labelKey }) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={active === kind ? 'primary' : 'ghost'}
              aria-pressed={active === kind}
              onClick={() => onRangeChange(reportRange(kind))}
            >
              {intl.get(labelKey)}
            </Button>
          ))}
        </div>

        {label && (
          // Подпись отрезка стоит ВСЕГДА, а не только при произвольных датах:
          // «Квартал» не говорит, какой именно, а отчёт печатают и пересылают.
          <p className="text-[0.8125rem] text-text-secondary">{label}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {extraSlot}
        {onCustomizeClick && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onCustomizeClick}
            className="gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {intl.get('report_period.customize')}
          </Button>
        )}
      </div>
    </div>
  );
};
