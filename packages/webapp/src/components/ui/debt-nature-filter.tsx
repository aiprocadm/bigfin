import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';

/** Природа долга: деньгами, поставкой или долга нет вовсе. */
export type DebtNature = 'money' | 'goods' | 'none';

export interface DebtNatureFilterProps {
  value?: DebtNature;
  onChange: (value?: DebtNature) => void;
}

/** Виды отбора в том порядке, в котором их читают. */
const NATURES: DebtNature[] = ['money', 'goods', 'none'];

/**
 * Отбор списка контрагентов по природе долга (FIN-023 ТЗ-2).
 *
 * ОТБОР ДЕЛАЕТ СЕРВЕР, А НЕ ЭКРАН. Список разбит на страницы: отфильтровать
 * загруженную страницу значило бы показать «ничего не найдено» при полной
 * базе должников на следующей странице.
 *
 * ПОВТОРНОЕ НАЖАТИЕ СНИМАЕТ ОТБОР. Иначе выбранный отбор снять нечем, и
 * человек уходит перезагружать страницу.
 */
export function DebtNatureFilter({ value, onChange }: DebtNatureFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-sm text-text-secondary">
        {intl.get('debt_nature.filter_label')}
      </span>
      {NATURES.map((nature) => (
        <button
          key={nature}
          type="button"
          aria-pressed={value === nature}
          onClick={() => onChange(value === nature ? undefined : nature)}
          className={cn(
            'min-h-[44px] rounded-default px-3 text-sm',
            value === nature
              ? 'bg-surface-elevated text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {intl.get(`debt_nature.filter_${nature}`)}
        </button>
      ))}
    </div>
  );
}
