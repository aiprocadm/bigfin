import * as React from 'react';
import intl from 'react-intl-universal';
import { Download, Printer, RefreshCw } from 'lucide-react';

import NumberFormatDropdown from '@/components/NumberFormatDropdown';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DialogsName } from '@/constants/dialogs';
import { useCanExport } from '@/hooks/utils/useAbilityContext';
import { useDialogActions } from '@/hooks/state';
import { BalanceSheetExportMenu } from './components';
import { useBalanceSheetContext } from './BalanceSheetProvider';

/**
 * Действия Баланса в шапке отчёта (UI-049-4 ТЗ-4, O14).
 *
 * БЫЛО: над отчётом стояла старая панель Blueprint — синяя шестерёнка,
 * «123 Формат», свой ряд кнопок, — а ниже новая полоса периода: две шапки
 * разного вида на одном экране. Теперь действия — в той же строке, что
 * период, и выглядят как у остальных отчётов. «Настроить отчёт» — кнопка
 * самой шапки, отдельной не нужно.
 */
export function BalanceSheetActions({
  numberFormat,
  onNumberFormatSubmit,
}: {
  numberFormat?: Record<string, any>;
  onNumberFormatSubmit: (values: any) => void;
}) {
  const { openDialog } = useDialogActions();
  const canExport = useCanExport();
  const { isLoading, refetchBalanceSheet } = useBalanceSheetContext() as any;

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1.5"
        onClick={() => refetchBalanceSheet()}
      >
        <RefreshCw className="h-4 w-4" aria-hidden />
        {intl.get('recalc_report')}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="sm" variant="ghost">
            {intl.get('format')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <NumberFormatDropdown
            numberFormat={numberFormat}
            onSubmit={onNumberFormatSubmit}
            submitDisabled={isLoading}
          />
        </PopoverContent>
      </Popover>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="gap-1.5"
        onClick={() => openDialog(DialogsName.BalanceSheetPdfPreview)}
      >
        <Printer className="h-4 w-4" aria-hidden />
        {intl.get('print')}
      </Button>
      {canExport && (
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="gap-1.5">
              <Download className="h-4 w-4" aria-hidden />
              {intl.get('export')}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            <BalanceSheetExportMenu />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
