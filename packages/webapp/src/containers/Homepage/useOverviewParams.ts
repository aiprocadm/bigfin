import React from 'react';

import {
  DashboardPeriod,
  DashboardPeriodKind,
  periodRange,
  readStoredPeriod,
  storePeriod,
} from './dashboardPeriod';
import {
  DashboardCompare,
  readStoredCompare,
  storeCompare,
} from './dashboardCompare';
import type { DirectionsSortBy } from './useDashboardOverview';

export interface OverviewParams {
  period: DashboardPeriod;
  choosePeriod: (kind: Exclude<DashboardPeriodKind, 'custom'>) => void;
  compare: DashboardCompare;
  chooseCompare: (compare: DashboardCompare) => void;
  directionsSortBy: DirectionsSortBy;
  setDirectionsSortBy: (sortBy: DirectionsSortBy) => void;
}

/**
 * Период, база сравнения и порядок направлений главной — в ОДНОМ месте.
 *
 * ЗАЧЕМ НАВЕРХУ. Показатели и блок «План» — разные блоки, и человек может
 * поставить их в любом порядке (FT-064). Но данные у них одни: запрос
 * `GET /dashboard/overview`. Если бы каждый блок держал выбор сам, ключи
 * запросов разошлись бы — запросов на главной стало бы два вместо одного
 * (правило п. 2.3 ТЗ), а план показывал бы не тот период, что плитки.
 */
export function useOverviewParams(): OverviewParams {
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

  const [period, setPeriod] = React.useState<DashboardPeriod>(() =>
    readStoredPeriod(storage),
  );
  const [compare, setCompare] = React.useState<DashboardCompare>(() =>
    readStoredCompare(storage),
  );
  const [directionsSortBy, setDirectionsSortBy] =
    React.useState<DirectionsSortBy>('profit');

  const choosePeriod = React.useCallback(
    (kind: Exclude<DashboardPeriodKind, 'custom'>) => {
      const next = { kind, ...periodRange(kind) };
      setPeriod(next);
      storePeriod(storage, next);
    },
    [storage],
  );

  const chooseCompare = React.useCallback(
    (next: DashboardCompare) => {
      setCompare(next);
      storeCompare(storage, next);
    },
    [storage],
  );

  return {
    period,
    choosePeriod,
    compare,
    chooseCompare,
    directionsSortBy,
    setDirectionsSortBy,
  };
}
