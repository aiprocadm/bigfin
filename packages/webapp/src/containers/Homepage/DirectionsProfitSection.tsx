import React from 'react';
import intl from 'react-intl-universal';

import {
  Bar,
  Cell,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import {
  ChartCard,
  chartAnimation,
  chartColor,
  yAxisProps,
} from '@/components/ui/charts';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { uiLocale } from '@/utils/formatShortDate';
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
 *
 * C20 (UI-051-5 ТЗ-4): полосы — на общем наборе графиков, с «Таблицей»;
 * тот же блок стоит на экране «Направления». Раньше полосы были рисованными
 * `div`, без таблицы и без подсказки с суммой.
 */
function DirectionsProfitSection({
  data,
  sortBy,
  onSortByChange,
  onRetry,
}: DirectionsProfitSectionProps) {
  // НАПРАВЛЕНИЙ НЕТ — БЛОКА НЕТ ВОВСЕ, а не пустой блок: незачем предлагать
  // человеку то, чем он не пользуется.
  if (data !== null && !data.rows.length) return null;

  const rows = (data?.rows ?? []).map((row) => ({
    ...row,
    label: row.name,
    formattedProfit: formatOrganizationMoney(row.profit),
    // Длина полосы — прибыль ПО МОДУЛЮ: у убытка полоса такая же длинная,
    // только приглушённая. Полосы влево от нуля налезали подписями на
    // названия направлений (живой проход). Знак — в подписи словами.
    size: Math.abs(row.profit),
    caption: directionCaption(row),
  }));

  return (
    <div className="flex flex-col gap-3">
      {/* Два вопроса — два порядка: «где больше денег» и «где лучше
          отдача». Это не одно и то же. Переключатель — над карточкой, а не
          в её шапке: рядом с «График / Таблица» на телефоне не помещался. */}
      {data !== null && (
        <SegmentedControl
          aria-label={intl.get('dashboard.directions_profit.sort_aria')}
          value={sortBy}
          onChange={onSortByChange}
          options={(['profit', 'margin'] as DirectionsSortBy[]).map((kind) => ({
            value: kind,
            label: intl.get(`dashboard.directions_profit.sort_${kind}`),
          }))}
          className="self-start"
        />
      )}
      <ChartCard
        title={intl.get('dashboard.directions_profit.title')}
        state={data === null ? 'error' : 'ready'}
        errorText={intl.get('dashboard.directions_profit.error')}
        onRetry={onRetry}
        heightOverride={{
          desktop: Math.max(120, rows.length * 40),
          phone: Math.max(120, rows.length * 40),
        }}
        table={{
          columns: [
            {
              key: 'name',
              label: intl.get('dashboard.directions_profit.col.direction'),
            },
            {
              key: 'formattedProfit',
              label: intl.get('deals.dashboard.profit'),
              numeric: true,
            },
            {
              key: 'marginPercent',
              label: intl.get('deals.funnel.margin'),
              numeric: true,
              render: (row) => marginText(row as DirectionProfitRow),
            },
          ],
          rows,
        }}
      >
        {({ isPhone }) => (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={rows}
              layout="vertical"
              margin={{
                top: 0,
                right: isPhone ? 150 : 230,
                bottom: 0,
                left: 0,
              }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                {...yAxisProps}
                width={isPhone ? 96 : 140}
                tickFormatter={(label: string) =>
                  label.length > 18 ? `${label.slice(0, 17)}…` : label
                }
              />
              <Bar
                dataKey="size"
                name={intl.get('deals.dashboard.profit')}
                fill={chartColor.ink}
                radius={4}
                maxBarSize={18}
                isAnimationActive={chartAnimation()}
              >
                {/* Убыток — приглушённым, не красным (см. выше). */}
                {rows.map((row) => (
                  <Cell
                    key={String(row.projectId)}
                    fill={row.isLoss ? chartColor.expense : chartColor.ink}
                  />
                ))}
                <LabelList
                  dataKey="caption"
                  position="right"
                  fontSize={12}
                  fill={chartColor.axis}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

/** «Н/о» вместо выдуманного нуля: без выручки делить не на что. */
export function marginText(
  row: Pick<DirectionProfitRow, 'marginPercent'>,
): string {
  return row.marginPercent === null
    ? intl.get('dashboard.directions_profit.margin_unknown')
    : // «−153,3 %», как везде в продукте, а не «-153.33%».
      `${new Intl.NumberFormat(uiLocale(), { maximumFractionDigits: 1 }).format(row.marginPercent)} %`;
}

/** Подпись у полосы: прибыль, рентабельность и пометка убытка словами. */
export function directionCaption(row: DirectionProfitRow): string {
  const text = `${formatOrganizationMoney(row.profit)} · ${marginText(row)}`;
  return row.isLoss
    ? `${text} · ${intl.get('dashboard.directions_profit.loss')}`
    : text;
}

/**
 * Операции без направления — отдельной строкой под блоком, а не потеряны:
 * иначе сумма блока не сойдётся с отчётом, и человек решит, что ошибка.
 */
export function DirectionsUnassigned({
  data,
}: {
  data: DirectionsProfit | null;
}) {
  if (!data?.unassigned || !data.rows.length) return null;
  return (
    <p className="-mt-2 text-subhead text-text-secondary">
      {intl.get('dashboard.directions_profit.unassigned', {
        amount: formatOrganizationMoney(data.unassigned.profit),
      })}
    </p>
  );
}

export default DirectionsProfitSection;
