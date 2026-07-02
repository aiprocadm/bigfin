import * as React from 'react';
import intl from 'react-intl-universal';
import { Hash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  decimalPlaces,
  moneyFormat,
  negativeFormat,
} from '@/constants/numberFormatsOptions';

// ---------------------------------------------------------------------------
// Типы (константы опций — легаси-модуль без типов, типизируем локально).
// ---------------------------------------------------------------------------

interface NumberFormatOption {
  key: string | number;
  text: string;
}

const moneyFormatOptions = moneyFormat as NumberFormatOption[];
const negativeFormatOptions = negativeFormat as NumberFormatOption[];
const decimalPlacesOptions = decimalPlaces as NumberFormatOption[];

/** Значения формата чисел отчёта — та же форма, что у легаси NumberFormatDropdown. */
export interface ReportNumberFormatValues {
  formatMoney: string;
  showZero: boolean;
  showInRed: boolean;
  divideOn1000: boolean;
  negativeFormat: string;
  precision: number;
}

const DEFAULT_NUMBER_FORMAT: ReportNumberFormatValues = {
  formatMoney: 'total',
  showZero: false,
  showInRed: false,
  divideOn1000: false,
  negativeFormat: 'mines',
  precision: 2,
};

interface ReportNumberFormatPopoverProps {
  /** Текущий формат чисел из query отчёта (может быть частичным). */
  numberFormat?: Partial<ReportNumberFormatValues>;
  /** Сабмит формата — тот же колбэк, что у легаси (onNumberFormatSubmit). */
  onSubmit: (values: ReportNumberFormatValues) => void;
  /** Блокировка кнопки применения, пока отчёт загружается. */
  submitDisabled?: boolean;
}

/**
 * Настройка формата чисел отчёта (замена легаси NumberFormatDropdown
 * на Blueprint Popover + Formik). Кнопка «Формат» + Radix Popover с формой.
 */
export function ReportNumberFormatPopover({
  numberFormat,
  onSubmit,
  submitDisabled,
}: ReportNumberFormatPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<ReportNumberFormatValues>({
    ...DEFAULT_NUMBER_FORMAT,
    ...numberFormat,
  });

  // При каждом открытии заново подхватываем актуальный формат из query.
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setValues({ ...DEFAULT_NUMBER_FORMAT, ...numberFormat });
    }
    setOpen(nextOpen);
  };

  const setValue = <K extends keyof ReportNumberFormatValues>(
    key: K,
    value: ReportNumberFormatValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyClick = () => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" type="button">
          <Hash className="h-4 w-4" aria-hidden />
          {intl.get('format')}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{intl.get('negative_format')}</Label>
            <Select
              value={values.negativeFormat}
              onValueChange={(value) => setValue('negativeFormat', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {negativeFormatOptions.map((option) => (
                  <SelectItem key={String(option.key)} value={String(option.key)}>
                    {option.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{intl.get('decimal_places')}</Label>
            <Select
              value={String(values.precision)}
              onValueChange={(value) => setValue('precision', Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {decimalPlacesOptions.map((option) => (
                  <SelectItem key={String(option.key)} value={String(option.key)}>
                    {option.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>{intl.get('money_format')}</Label>
            <Select
              value={values.formatMoney}
              onValueChange={(value) => setValue('formatMoney', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moneyFormatOptions.map((option) => (
                  <SelectItem key={String(option.key)} value={String(option.key)}>
                    {option.text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-between gap-3 text-sm text-text-primary">
              {intl.get('show_zero')}
              <Switch
                checked={values.showZero}
                onCheckedChange={(checked) => setValue('showZero', checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-sm text-text-primary">
              {intl.get('show_negative_in_red')}
              <Switch
                checked={values.showInRed}
                onCheckedChange={(checked) => setValue('showInRed', checked)}
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-sm text-text-primary">
              {intl.get('divide_on_1000')}
              <Switch
                checked={values.divideOn1000}
                onCheckedChange={(checked) => setValue('divideOn1000', checked)}
              />
            </label>
          </div>

          <div className="flex justify-end border-t border-border pt-3">
            <Button
              size="sm"
              type="button"
              onClick={handleApplyClick}
              disabled={submitDisabled}
            >
              {intl.get('apply')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
