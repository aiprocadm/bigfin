import * as React from 'react';
import intl from 'react-intl-universal';
import {
  FileSpreadsheet,
  FileText,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Settings2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ReportNumberFormatPopover,
  type ReportNumberFormatValues,
} from './ReportNumberFormatPopover';

export interface FinancialReportToolbarProps {
  /** Открыт ли настройщик — меняет подпись кнопки («Настроить» / «Скрыть»). */
  customizeActive?: boolean;
  /** Открыть/закрыть панель настроек отчёта (redux-toggle конкретного отчёта). */
  onCustomizeClick: () => void;
  /** Пересчитать отчёт (refetch). */
  onRefreshClick?: () => void;
  /** Печать (открывает легаси-диалог PDF-превью по имени). */
  onPrintClick?: () => void;
  /** Экспорт в XLSX. */
  onXlsxExportClick?: () => void;
  /** Экспорт в CSV. */
  onCsvExportClick?: () => void;
  /** Текущий формат чисел; вместе с onNumberFormatSubmit включает кнопку «Формат». */
  numberFormat?: Partial<ReportNumberFormatValues>;
  onNumberFormatSubmit?: (values: ReportNumberFormatValues) => void;
  numberFormatDisabled?: boolean;
  /** Дополнительные действия конкретного отчёта (слева, рядом с «Настроить»). */
  children?: React.ReactNode;
}

/**
 * Общий экшнбар финансового отчёта (замена легаси DashboardActionsBar +
 * Blueprint Navbar). Плоский flex-тулбар: одна secondary «Настроить отчёт»,
 * ghost «Обновить» и «Формат», прочее (печать/экспорт) — в меню «⋯».
 */
export function FinancialReportToolbar({
  customizeActive,
  onCustomizeClick,
  onRefreshClick,
  onPrintClick,
  onXlsxExportClick,
  onCsvExportClick,
  numberFormat,
  onNumberFormatSubmit,
  numberFormatDisabled,
  children,
}: FinancialReportToolbarProps) {
  const hasMoreMenu = Boolean(
    onPrintClick || onXlsxExportClick || onCsvExportClick,
  );

  return (
    <div className="bigfin-ui flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-3 py-1.5">
      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={onCustomizeClick}
      >
        <Settings2 className="h-4 w-4" aria-hidden />
        {customizeActive
          ? intl.get('hide_customizer')
          : intl.get('customize_report')}
      </Button>

      {numberFormat && onNumberFormatSubmit ? (
        <ReportNumberFormatPopover
          numberFormat={numberFormat}
          onSubmit={onNumberFormatSubmit}
          submitDisabled={numberFormatDisabled}
        />
      ) : null}

      {children}

      <div className="flex-1" aria-hidden />

      {onRefreshClick ? (
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={onRefreshClick}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          {intl.get('refresh')}
        </Button>
      ) : null}

      {hasMoreMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              aria-label={intl.get('more_actions')}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>

          {/* Контент в портале вне .bigfin-ui → шрифт и box-sizing вручную. */}
          <DropdownMenuContent align="end" className="box-border font-sans">
            {onPrintClick ? (
              <DropdownMenuItem onClick={onPrintClick}>
                <Printer className="mr-2 h-4 w-4" aria-hidden />
                {intl.get('print')}
              </DropdownMenuItem>
            ) : null}

            {onPrintClick && (onXlsxExportClick || onCsvExportClick) ? (
              <DropdownMenuSeparator />
            ) : null}

            {onXlsxExportClick || onCsvExportClick ? (
              <DropdownMenuLabel className="text-xs font-medium text-text-muted">
                {intl.get('export')}
              </DropdownMenuLabel>
            ) : null}

            {onXlsxExportClick ? (
              <DropdownMenuItem onClick={onXlsxExportClick}>
                <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden />
                XLSX (Microsoft Excel)
              </DropdownMenuItem>
            ) : null}

            {onCsvExportClick ? (
              <DropdownMenuItem onClick={onCsvExportClick}>
                <FileText className="mr-2 h-4 w-4" aria-hidden />
                CSV
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
