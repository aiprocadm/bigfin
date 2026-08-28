import React from 'react';

import {
  amountSeparators,
  parseAmountInput,
  formatAmountForInput,
} from '@/utils/amountInput';
import { CurrencyInput } from './CurrencyInput';

/**
 * З1 карты v37. Денежное поле продукта говорит на языке организации.
 *
 * Само поле (`CurrencyInput`) заведено с американскими знаками: копейки
 * точкой, разряды запятой. Ни один из экранов эти знаки не переопределял,
 * поэтому напечатанное «1000,50» уходило в учёт как «100050».
 *
 * Обёртка делает два дела и больше ничего:
 *  — даёт полю знаки организации (у русской: копейки запятой, разряды
 *    неразрывным пробелом — ровно так продукт суммы и печатает);
 *  — переводит значение на границе: внутрь поля уходит строка в формате
 *    организации, наружу — машинное число с точкой, каким его ждут форма,
 *    сервер и `parseFloat` в ячейках таблиц.
 *
 * Недопечатанный знак копеек («1000,») наружу отдаётся как «1000.» —
 * иначе поле, подчинённое своему же значению, стирало бы запятую сразу
 * после нажатия, и копейки было бы не ввести.
 */
export interface OrganizationMoneyInputProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (value: string | undefined, name?: string) => void;
  onBlurValue?: (value: string | undefined, name?: string) => void;
  [key: string]: unknown;
}

/** Значение поля → машинное число строкой; пустое остаётся пустым. */
export function toCanonicalAmount(
  value: string | undefined,
  separators = amountSeparators(),
): string | undefined {
  if (value === undefined || value === null || value === '') return value;

  const parsed = parseAmountInput(value, separators);
  if (!parsed) return parsed;

  // Человек ещё печатает: знак копеек набран, сами копейки — нет.
  const unfinished = new RegExp(`[.,]$`).test(String(value));

  return unfinished ? `${parsed}.` : parsed;
}

export const OrganizationMoneyInput: React.FC<OrganizationMoneyInputProps> = ({
  value,
  defaultValue,
  onChange,
  onBlurValue,
  ...props
}) => {
  const separators = amountSeparators();

  const translate = (raw: string | undefined, name?: string) =>
    toCanonicalAmount(raw, separators);

  return (
    <CurrencyInput
      decimalSeparator={separators.decimalSeparator}
      groupSeparator={separators.groupSeparator}
      value={
        value === undefined
          ? undefined
          : formatAmountForInput(value as string, separators)
      }
      defaultValue={
        defaultValue === undefined
          ? undefined
          : formatAmountForInput(defaultValue as string, separators)
      }
      onChange={(raw: string | undefined, name?: string) =>
        onChange?.(translate(raw, name), name)
      }
      onBlurValue={(raw: string | undefined, name?: string) =>
        onBlurValue?.(translate(raw, name), name)
      }
      {...props}
    />
  );
};
