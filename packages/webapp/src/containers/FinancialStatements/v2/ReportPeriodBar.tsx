import * as React from 'react';
import intl from 'react-intl-universal';
import { SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/cn';

import { ReportRange, reportRange } from './reportPeriod';
import {
  REPORT_BASES,
  REPORT_BUILD_BY,
  REPORT_SCALES,
  ReportBasis,
  ReportBuildBy,
  ReportScale,
} from './reportControls';

export interface ReportPeriodBarProps {
  /** Текущий отрезок отчёта. */
  range: Partial<ReportRange> | null | undefined;
  onRangeChange: (range: ReportRange) => void;
  /** Открыть панель остальных настроек отчёта. */
  onCustomizeClick?: () => void;
  /** Что показать справа: переключатель метода учёта и подобное. */
  extraSlot?: React.ReactNode;

  /**
   * Переключатели отчёта (FIN-012 ТЗ-2). Каждый показывается ТОЛЬКО когда
   * отчёт его поддерживает — то есть когда передан обработчик.
   *
   * Неактивная кнопка хуже отсутствующей: она обещает возможность, которой
   * нет, и человек тратит время, выясняя, почему она не нажимается.
   */
  scale?: ReportScale;
  onScaleChange?: (scale: ReportScale) => void;
  basis?: ReportBasis;
  onBasisChange?: (basis: ReportBasis) => void;
  buildBy?: ReportBuildBy;
  onBuildByChange?: (buildBy: ReportBuildBy) => void;

  className?: string;
}

/**
 * Шапка отчёта v2 (UI-049-1 ТЗ-4) — общая для отчётов с полосой периода.
 *
 * БЫЛО (O9 живого прохода): шесть кнопок периода, которые переносились на
 * вторую строку, подпись отрезка отдельной строкой, «Масштаб» и «Учёт» —
 * серые системные списки браузера.
 *
 * СТАЛО — одна строка, как в шаблоне «Отчёт» (§8):
 * - период ОДНИМ полем «1 янв. – 31 дек. 2026 г.» с готовыми вариантами и
 *   стрелками ‹ › (UI-044-2). Подпись отрезка — в самом поле, отчёт
 *   печатают и пересылают — она видна всегда;
 * - масштаб — сегментами;
 * - «Учёт» и «Строить по» — в меню «Вид»: их меняют редко;
 * - остальное — справа (юрлицо, настройки отчёта).
 *
 * Каждый переключатель — ТОЛЬКО когда отчёт его поддерживает (FIN-012 ТЗ-2):
 * неактивная кнопка хуже отсутствующей.
 */
export const ReportPeriodBar = ({
  range,
  onRangeChange,
  onCustomizeClick,
  extraSlot,
  scale,
  onScaleChange,
  basis,
  onBasisChange,
  buildBy,
  onBuildByChange,
  className,
}: ReportPeriodBarProps) => {
  // Отрезок по умолчанию — текущий год, как у отчётов без выбранного периода.
  const fallback = reportRange('year');
  const value = {
    from: range?.fromDate ?? fallback.fromDate,
    to: range?.toDate ?? fallback.toDate,
  };
  const hasView = Boolean(onBasisChange || onBuildByChange);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-border pb-4',
        className,
      )}
    >
      <DateRangePicker
        value={value}
        onChange={(next) => onRangeChange({ fromDate: next.from, toDate: next.to })}
      />

      {onScaleChange && (
        <SegmentedControl
          size="sm"
          aria-label={intl.get('report_controls.scale')}
          value={scale ?? 'month'}
          onChange={(next) => onScaleChange(next as ReportScale)}
          options={REPORT_SCALES.map((item) => ({
            value: item,
            label: intl.get(`report_controls.scale.${item}`),
          }))}
        />
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {extraSlot}
        {hasView && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="ghost">
                {intl.get('report_controls.view')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {onBasisChange && (
                <>
                  <DropdownMenuLabel>{intl.get('report_controls.basis')}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={basis ?? 'accrual'}
                    onValueChange={(next) => onBasisChange(next as ReportBasis)}
                  >
                    {REPORT_BASES.map((item) => (
                      <DropdownMenuRadioItem key={item} value={item}>
                        {intl.get(`report_controls.basis.${item}`)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </>
              )}
              {onBasisChange && onBuildByChange && <DropdownMenuSeparator />}
              {onBuildByChange && (
                <>
                  <DropdownMenuLabel>{intl.get('report_controls.build_by')}</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={buildBy ?? 'periods'}
                    onValueChange={(next) => onBuildByChange(next as ReportBuildBy)}
                  >
                    {REPORT_BUILD_BY.map((item) => (
                      <DropdownMenuRadioItem key={item} value={item}>
                        {intl.get(`report_controls.build_by.${item}`)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
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
