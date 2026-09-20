import React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import type {
  DirectionProfitRow,
  DirectionsProfit,
  DirectionsSortBy,
} from './useDashboardOverview';

export interface DirectionsProfitSectionProps {
  /** `null` — блок не посчитался: показываем состояние ошибки. */
  data: DirectionsProfit | null;
  sortBy: DirectionsSortBy;
  onSortByChange: (sortBy: DirectionsSortBy) => void;
  onRetry?: () => void;
}

/**
 * «Прибыльность направлений» (FIN-018 ТЗ-2).
 *
 * ЗАЧЕМ. Направление — это ярлык «розница», «опт», «объект на Ленина».
 * Без блока предприниматель узнаёт, что одно из них убыточно, только когда
 * открывает отчёт целиком, — а открывает он его редко.
 *
 * ПОЧЕМУ УБЫТОК НЕ КРАСНЫЙ. Красный в продукте занят проблемами, которые
 * требуют действия сегодня: кассовый разрыв, просрочка. Убыточное
 * направление — повод подумать, а не пожар. Красным оно обесценило бы
 * красный там, где он настоящий. Поэтому знак минус и пометка словами.
 */
function DirectionsProfitSection({
  data,
  sortBy,
  onSortByChange,
  onRetry,
}: DirectionsProfitSectionProps) {
  if (data === null) {
    return (
      <section className="rounded-default border border-border bg-surface p-4">
        <h2 className="mb-2 text-base font-medium text-text-primary">
          {intl.get('dashboard.directions_profit.title')}
        </h2>
        <p className="text-sm text-text-secondary">
          {intl.get('dashboard.directions_profit.error')}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 min-h-[44px] text-sm text-action hover:underline"
          >
            {intl.get('dashboard.directions_profit.retry')}
          </button>
        )}
      </section>
    );
  }

  // НАПРАВЛЕНИЙ НЕТ — БЛОКА НЕТ ВОВСЕ, а не пустой блок: незачем предлагать
  // человеку то, чем он не пользуется.
  if (!data.rows.length) return null;

  // Ширина полосы считается от самой большой прибыли по модулю: у убытка
  // полоса такая же длинная, только в другую сторону по смыслу.
  const scale = Math.max(...data.rows.map((row) => Math.abs(row.profit)), 1);

  return (
    <section className="rounded-default border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium text-text-primary">
          {intl.get('dashboard.directions_profit.title')}
        </h2>
        {/* Два вопроса — два порядка: «где больше денег» и «где лучше
            отдача». Это не одно и то же. */}
        <div className="flex items-center gap-1">
          {(['profit', 'margin'] as DirectionsSortBy[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onSortByChange(kind)}
              className={cn(
                'min-h-[44px] rounded-default px-3 text-sm',
                sortBy === kind
                  ? 'bg-surface-elevated text-text-primary'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {intl.get(`dashboard.directions_profit.sort_${kind}`)}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {data.rows.map((row) => (
          <DirectionRow key={row.projectId} row={row} scale={scale} />
        ))}
      </ul>

      {/* Операции без направления — отдельной строкой, а не потеряны: иначе
          сумма блока не сойдётся с отчётом, и человек решит, что ошибка. */}
      {data.unassigned && (
        <p className="mt-3 border-t border-border pt-3 text-sm text-text-secondary">
          {intl.get('dashboard.directions_profit.unassigned', {
            amount: formatOrganizationMoney(data.unassigned.profit),
          })}
        </p>
      )}
    </section>
  );
}

function DirectionRow({
  row,
  scale,
}: {
  row: DirectionProfitRow;
  scale: number;
}) {
  const width = Math.round((Math.abs(row.profit) / scale) * 100);

  return (
    <li className="py-2">
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{row.name}</span>
          {row.isLoss && (
            <span className="shrink-0 rounded-default bg-surface-elevated px-2 py-0.5 text-xs text-text-secondary">
              {intl.get('dashboard.directions_profit.loss')}
            </span>
          )}
        </span>
        <span className="shrink-0 tabular-nums text-text-secondary">
          {formatOrganizationMoney(row.profit)}
          {' · '}
          {/* «Н/о» вместо выдуманного нуля: без выручки делить не на что. */}
          {row.marginPercent === null
            ? intl.get('dashboard.directions_profit.margin_unknown')
            : `${row.marginPercent}%`}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface-elevated">
        <div
          className={cn(
            'h-2 rounded-full',
            row.isLoss ? 'bg-text-muted' : 'bg-action',
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </li>
  );
}

export default DirectionsProfitSection;
