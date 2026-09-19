import React from 'react';
import intl from 'react-intl-universal';
import { useQuery } from 'react-query';

import useApiRequest from '@/hooks/useRequest';
import { fromApi } from '@/utils/fromApi';
import { Skeleton } from '@/components/ui/skeleton';

import {
  type BalanceStructure,
  type BalanceStructureSlice,
  drawableSlices,
  formatShare,
  negativeSlices,
  shouldShowStructure,
} from './balanceStructureView';

/**
 * Цвета полос.
 *
 * Не светофор: ни одна группа баланса не «хорошая» и не «плохая». Обязательства
 * — это не беда, а способ купить оборудование; капитал — не заслуга. Поэтому
 * оттенки одного ряда, различающие соседние полосы, и ничего больше.
 */
const TONES = [
  'rgb(var(--c-action))',
  'rgb(var(--c-action) / 0.75)',
  'rgb(var(--c-action) / 0.5)',
  'rgb(var(--c-action) / 0.3)',
];

function StructureBar({
  title,
  slices,
}: {
  title: string;
  slices: BalanceStructureSlice[];
}) {
  const drawable = drawableSlices(slices);
  const negative = negativeSlices(slices);

  if (drawable.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-text-secondary">{title}</span>

      <div className="flex h-6 w-full overflow-hidden rounded-default">
        {drawable.map((slice, index) => (
          <div
            key={slice.id}
            style={{
              width: `${slice.share * 100}%`,
              background: TONES[index % TONES.length],
            }}
            title={`${slice.name} · ${formatShare(slice.share)}`}
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
        {drawable.map((slice, index) => (
          <li key={slice.id} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: TONES[index % TONES.length] }}
            />
            <span className="text-text-primary">{slice.name}</span>
            <span className="tabular-nums">{formatShare(slice.share)}</span>
          </li>
        ))}
      </ul>

      {/* Отрицательную группу нарисовать нечем, но промолчать о ней нельзя:
          сумма полос тогда не сойдётся с итогом в таблице. */}
      {negative.length > 0 && (
        <p className="text-xs text-text-muted">
          {intl.get('reports.structure.negative_groups', {
            groups: negative.map((slice) => slice.name).join(', '),
          })}
        </p>
      )}
    </div>
  );
}

/**
 * Картинка «из чего состоит имущество и за чей счёт куплено» (остаток О2 ТЗ).
 *
 * Две полосы, а не круг: баланс тем и устроен, что обе стороны равны, и круг
 * это равенство прячет. Числа считает сервер — картинка обязана показывать
 * ровно то же, что таблица под ней.
 */
export default function BalanceStructureChart({
  fromDate,
  toDate,
}: {
  fromDate?: string;
  toDate?: string;
}) {
  const apiRequest = useApiRequest();

  const { data, isLoading, isError } = useQuery(
    ['BALANCE_STRUCTURE', fromDate, toDate],
    () =>
      apiRequest
        .get('financial-reports/chart/structure', {
          params: { from: fromDate, to: toDate },
        })
        .then((res: any) => fromApi<BalanceStructure>(res.data)),
    { enabled: Boolean(fromDate && toDate), keepPreviousData: true },
  );

  if (isLoading) {
    return <Skeleton className="mb-4 h-32 w-full" />;
  }

  // Сбой картинки не должен закрывать таблицу: цифры важнее.
  if (isError) return null;
  if (!shouldShowStructure(data)) return null;

  return (
    <div className="mb-4 flex flex-col gap-4 rounded-default border border-border bg-surface p-4">
      <StructureBar
        title={intl.get('reports.structure.assets')}
        slices={data!.assets}
      />
      <StructureBar
        title={intl.get('reports.structure.liabilities_equity')}
        slices={data!.liabilitiesEquity}
      />
    </div>
  );
}
