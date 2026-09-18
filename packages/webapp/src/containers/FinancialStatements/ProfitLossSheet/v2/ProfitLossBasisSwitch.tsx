// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';

import { Button } from '@/components/ui/button';
import { Features } from '@/constants/features';
import { useFeatureCan } from '@/hooks/state/feature';
import { cn } from '@/lib/cn';

import {
  ACCOUNTING_BASIS_OPTIONS,
  accountingBasisHintKey,
  resolveAccountingBasis,
  type AccountingBasis,
} from '../../accountingBasis';

interface ProfitLossBasisSwitchProps {
  /** Метод из адреса отчёта — может отсутствовать или быть мусором. */
  basis?: unknown;
  /** Смена метода перезапрашивает отчёт: числа считаются заново. */
  onChange: (basis: AccountingBasis) => void;
}

/**
 * Переключатель метода учёта прямо в шапке ОПиУ (п. 4.3 ТЗ).
 *
 * Раньше он лежал в панели «Настроить отчёт» — человек не знал, что цифры
 * можно посмотреть вторым способом, и не понимал, каким они посчитаны сейчас.
 * Под переключателем — пояснение в одну строку, чем методы отличаются.
 *
 * Показывается только при включённом флаге `accrual_pnl`: без него движок
 * второй метод не считает, и кнопка была бы мёртвой.
 */
export function ProfitLossBasisSwitch({
  basis,
  onChange,
}: ProfitLossBasisSwitchProps) {
  const { featureCan } = useFeatureCan();
  const isAccrualFeatureCan = featureCan(Features.AccrualPnl);

  if (!isAccrualFeatureCan) {
    return null;
  }

  const active = resolveAccountingBasis(basis, isAccrualFeatureCan);

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <div
        role="group"
        aria-label={intl.get('accounting_basis').replace(/:\s*$/, '')}
        className="inline-flex w-fit rounded-md border border-border p-0.5"
      >
        {ACCOUNTING_BASIS_OPTIONS.map((option) => {
          const isActive = option.value === active;

          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={isActive ? 'primary' : 'ghost'}
              aria-pressed={isActive}
              className={cn('rounded', !isActive && 'text-text-muted')}
              onClick={() => {
                // Лишний запрос отчёта ради того же метода — пустая трата.
                if (!isActive) onChange(option.value);
              }}
            >
              {intl.get(option.labelKey)}
            </Button>
          );
        })}
      </div>

      <p className="text-sm text-text-muted">
        {intl.get(accountingBasisHintKey(active))}
      </p>
    </div>
  );
}

export default ProfitLossBasisSwitch;
