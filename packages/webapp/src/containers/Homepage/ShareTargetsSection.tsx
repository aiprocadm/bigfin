import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { MoneyField } from '@/components/ui/money-field';
import {
  useDashboardPreferences,
  useSaveDashboardPreferences,
  type DashboardTargetsPreference,
} from '@/hooks/query/dashboardPreferences';

import { useDashboardOverview } from './useDashboardOverview';
import type { OverviewParams } from './useOverviewParams';
import { formatPercent } from './formatPercent';
import { parseTarget, shareStatus } from './shareTargets';

type TargetKey = keyof DashboardTargetsPreference;

/**
 * «Не переплачиваем ли?» (FT-065 ТЗ-3): доля расходов и доля ФОТ в
 * выручке против СВОЕЙ цели.
 *
 * Абстрактный процент ни о чём не говорит: 40 % расходов — много это или
 * мало, знает только сам владелец. Поэтому рядом с долей — его собственная
 * норма, и превышение подсвечивается с числом: «выше цели на 4 п. п.».
 *
 * Данные — из того же ответа, что плитки: отдельного запроса у блока нет.
 */
export default function ShareTargetsSection({
  params,
}: {
  params: OverviewParams;
}) {
  const { data, isLoading, isError } = useDashboardOverview(
    params.period,
    params.directionsSortBy,
    params.compare,
  );
  const { data: preferences } = useDashboardPreferences();
  const { mutate: save } = useSaveDashboardPreferences();

  if (isLoading || isError || !data?.plan?.shares) return null;

  const { shares } = data.plan;
  const targets: DashboardTargetsPreference = preferences?.targets ?? {
    expenseShare: null,
    payrollShare: null,
  };

  // Цели уходят обе сразу: сервер хранит их одним значением, и сохранение
  // одной без другой стёрло бы вторую.
  const saveTarget = (key: TargetKey, value: number | null) => {
    if (targets[key] === value) return;
    save({ targets: { ...targets, [key]: value } });
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-medium text-text-primary">
        {intl.get('dashboard.shares.title')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <ShareCard
          id="expense-share"
          title={intl.get('dashboard.shares.expenses')}
          share={shares.expenses}
          target={targets.expenseShare}
          onTargetChange={(value) => saveTarget('expenseShare', value)}
        />
        <ShareCard
          id="payroll-share"
          title={intl.get('dashboard.shares.payroll')}
          share={shares.payroll}
          target={targets.payrollShare}
          onTargetChange={(value) => saveTarget('payrollShare', value)}
          // Без статьи зарплаты считать долю не из чего: это не «0 %», а
          // незаконченная настройка — и говорим, где её закончить.
          notConfigured={!shares.payrollConfigured}
        />
      </div>
    </section>
  );
}

function ShareCard({
  id,
  title,
  share,
  target,
  onTargetChange,
  notConfigured = false,
}: {
  id: string;
  title: string;
  share: number | null;
  target: number | null;
  onTargetChange: (value: number | null) => void;
  notConfigured?: boolean;
}) {
  // Поле держит набранное само и сохраняет, когда человек из него ушёл:
  // сохранять каждую цифру значило бы слать запрос на каждое нажатие.
  const [draft, setDraft] = React.useState<number | undefined>(
    target ?? undefined,
  );
  React.useEffect(() => {
    setDraft(target ?? undefined);
  }, [target]);

  const status = notConfigured ? null : shareStatus(share, target);
  const over = status?.kind === 'over';

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-default border p-4',
        over ? 'border-warning bg-warning/10' : 'border-border bg-surface',
      )}
    >
      <div className="text-sm text-text-secondary">{title}</div>

      {notConfigured ? (
        <Link
          to="/payroll"
          className="text-sm text-text-primary underline underline-offset-2"
        >
          {intl.get('dashboard.shares.payroll_not_configured')}
        </Link>
      ) : status?.kind === 'no_revenue' ? (
        // Выручки нет — процента нет: доля от нуля была бы выдумкой.
        <div className="text-sm text-text-muted">
          {intl.get('dashboard.shares.no_revenue')}
        </div>
      ) : (
        <div
          className={cn(
            'text-xl font-semibold tabular-nums',
            over ? 'text-danger' : 'text-text-primary',
          )}
        >
          {formatPercent(share as number)} %
        </div>
      )}

      {status?.kind === 'over' && (
        <div className="text-sm font-medium text-danger">
          {intl.get('dashboard.shares.over_target', {
            points: formatPercent(status.by),
          })}
        </div>
      )}
      {status?.kind === 'within' && (
        <div className="text-sm text-text-secondary">
          {intl.get('dashboard.shares.within_target')}
        </div>
      )}

      <label
        htmlFor={`dashboard-target-${id}`}
        className="mt-1 flex items-center justify-between gap-3 text-sm text-text-secondary"
      >
        <span>{intl.get('dashboard.shares.target')}</span>
        <MoneyField
          id={`dashboard-target-${id}`}
          className="w-24 text-right"
          value={draft ?? ''}
          onChange={setDraft}
          onBlur={() => onTargetChange(parseTarget(draft))}
        />
      </label>
    </div>
  );
}
