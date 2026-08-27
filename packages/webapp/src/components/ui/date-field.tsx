import * as React from 'react';
import moment from 'moment';

import { DatePicker } from './date-picker';

/**
 * Ж1 карты v32. Поле даты для экранов, которые хранят дату СТРОКОЙ.
 *
 * Семнадцать экранов вводили дату системным `<input type="date">`: у
 * английского браузера это «08/27/2026» в русском продукте. Своё поле
 * даты у продукта есть (`DatePicker`), но оно работает с `Date`, а эти
 * экраны держат строку «ГГГГ-ММ-ДД» — и в форме, и в запросе к серверу.
 *
 * Обёртка избавляет от перевода строки в дату и обратно в каждом месте:
 * снаружи всё та же строка, внутри — поле продукта.
 */
const ISO = 'YYYY-MM-DD';

/** Дата → строка «ГГГГ-ММ-ДД»; пустое значение → пустая строка. */
export function toIsoDate(date: Date | undefined | null): string {
  if (!date) return '';
  const parsed = moment(date);
  return parsed.isValid() ? parsed.format(ISO) : '';
}

/** Строка «ГГГГ-ММ-ДД» → дата; мусор и пустота → undefined. */
export function fromIsoDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = moment(value, ISO, true);
  // Нестрогий разбор оставлен запасным: сервер иногда отдаёт дату со
  // временем, и ронять из-за этого поле незачем.
  const fallback = parsed.isValid() ? parsed : moment(value);
  return fallback.isValid() ? fallback.toDate() : undefined;
}

export interface DateFieldProps {
  value?: string | null;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateField({
  value,
  onChange,
  placeholder,
  disabled,
  className,
}: DateFieldProps) {
  return (
    <DatePicker
      value={fromIsoDate(value)}
      onChange={(date) => onChange?.(toIsoDate(date))}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
