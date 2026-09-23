import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';

import { AppToaster } from '@/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showApiError } from '@/utils/showApiError';
import { useSetAccrualPeriod } from '@/hooks/query/cashflowAccounts';
import { ACCRUAL_PERIOD_RE } from '../AccrualPeriodField';
import { accrualTargets } from './accrualBulk';

/**
 * Массовое действие над проведёнными операциями: месяц начисления (FT-013
 * ТЗ-3). Проставить — операции пойдут в прибыль этим месяцем; снять —
 * вернутся в месяц платежа. Денег и остатков это не меняет.
 */
export function AccrualBulkBar({ rows, onDone }: { rows: any[]; onDone: () => void }) {
  const [period, setPeriod] = React.useState('');
  const { mutateAsync, isLoading } = useSetAccrualPeriod();
  const { ids, skipped } = accrualTargets(rows);

  const apply = async (value: string | null) => {
    try {
      await mutateAsync({ ids, accrual_period: value });
      AppToaster.show({
        message: intl.get(
          value ? 'accrual_period.bulk.applied' : 'accrual_period.bulk.cleared',
          { count: ids.length },
        ),
        intent: Intent.SUCCESS,
      });
      onDone();
    } catch (error) {
      showApiError(error);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-text-secondary">
        {intl.get('accrual_period.label')}
      </span>
      <Input
        type="month"
        className="h-8 w-40"
        aria-label={intl.get('accrual_period.label')}
        value={period}
        onChange={(event) => setPeriod(event.target.value)}
      />
      <Button
        size="sm"
        disabled={isLoading || ids.length === 0 || !ACCRUAL_PERIOD_RE.test(period)}
        onClick={() => apply(period)}
      >
        {intl.get('accrual_period.bulk.apply')}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={isLoading || ids.length === 0}
        onClick={() => apply(null)}
      >
        {intl.get('accrual_period.bulk.clear')}
      </Button>
      {skipped > 0 && (
        <span className="text-xs text-text-muted">
          {intl.get('accrual_period.bulk.skipped', { count: skipped })}
        </span>
      )}
    </div>
  );
}
