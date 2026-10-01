import * as React from 'react';
import intl from 'react-intl-universal';

import { SegmentedControl } from '@/components/ui/segmented-control';
import DirectionsProfitSection, { DirectionsUnassigned } from '@/containers/Homepage/DirectionsProfitSection';
import { periodRange, type DashboardPeriodKind } from '@/containers/Homepage/dashboardPeriod';
import { useDashboardOverview, type DirectionsSortBy } from '@/containers/Homepage/useDashboardOverview';

/**
 * Прибыль и маржа по направлениям на экране «Направления» (C20, UI-051-5
 * ТЗ-4). Справочник отвечал «какие направления есть», но не «какое из них
 * зарабатывает» — за этим приходилось идти на главную или в отчёт.
 *
 * Числа — из того же ответа, что и главная (`dashboard/overview`,
 * `directionsProfit`): новой ручки нет, и суммы совпадают с главной до копейки.
 */
// Те же периоды, что на главной. Список свой, а не из OverviewSection: иначе
// в кусок сборки «Направлений» уехала бы вся главная.
const PERIOD_KINDS: Array<Exclude<DashboardPeriodKind, 'custom'>> = ['month', 'quarter', 'year'];

export function DirectionsProfitPanel() {
  const [kind, setKind] = React.useState<Exclude<DashboardPeriodKind, 'custom'>>('month');
  const [sortBy, setSortBy] = React.useState<DirectionsSortBy>('profit');
  const period = React.useMemo(() => periodRange(kind), [kind]);
  const { data, isError, refetch } = useDashboardOverview(period, sortBy);

  // Пока ответ не пришёл — блока нет: скелет таблицы ниже и так показывает,
  // что экран грузится, а второй скелет только дёргал бы раскладку.
  if (!data && !isError) return null;
  const directions = isError ? null : data?.directionsProfit ?? null;

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        aria-label={intl.get('directions.profit.period_aria')}
        value={kind}
        onChange={setKind}
        options={PERIOD_KINDS.map((value) => ({ value, label: intl.get(`dashboard.period.${value}`) }))}
        className="self-start"
      />
      <DirectionsProfitSection
        data={directions}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onRetry={() => {
          refetch();
        }}
      />
      <DirectionsUnassigned data={directions} />
    </div>
  );
}
