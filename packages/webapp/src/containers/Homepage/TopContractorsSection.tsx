import React from 'react';
import intl from 'react-intl-universal';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import {
  BAR_MAX_SIZE,
  BAR_RADIUS,
  CURVE,
  ChartCard,
  ChartLegend,
  ChartTooltip,
  chartAnimation,
  chartColor,
  formatAxisMoney,
  formatAxisPercent,
  gridProps,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';
import type { TopContractors } from './useDashboardOverview';

export interface TopContractorsSectionProps {
  /** `null` — блок не посчитался: показываем состояние ошибки. */
  data: TopContractors | null;
  /** Перезапросить главную: блок не умеет запрашивать себя отдельно. */
  onRetry?: () => void;
}

/**
 * «Кто приносит прибыль» — концентрация выручки по контрагентам
 * (FIN-018 ТЗ-2).
 *
 * ЗАЧЕМ. Главная отвечала на «сколько денег» и «что горит», но не на «НА КОМ
 * ДЕРЖИТСЯ БИЗНЕС». Когда три клиента дают восемьдесят процентов выручки,
 * уход одного меняет год, и узнать об этом лучше заранее.
 *
 * ЧЕГО НЕТ У КОНКУРЕНТА. ПланФакт рисует столбцы и линию накопительной доли
 * и оставляет человека читать график. Здесь под графиком стоит фраза
 * словами. График надо уметь читать, фразу читать не надо.
 */
function TopContractorsSection({ data, onRetry }: TopContractorsSectionProps) {
  // Продаж за период не было — блока нет вовсе. Пустой график с подписью
  // «0 %» выглядит поломкой, а не ответом.
  if (data !== null && !data.rows.length) return null;

  const chartRows = (data?.rows ?? []).map((row) => ({
    ...row,
    name: row.isRest
      ? intl.get('dashboard.top_contractors.rest')
      : row.name,
  }));
  const revenueName = intl.get('dashboard.top_contractors.col.revenue');
  const shareName = intl.get('dashboard.top_contractors.col.cumulative');

  return (
    // СБОЙ БЛОКА НЕ РОНЯЕТ ГЛАВНУЮ, но и молчать нельзя: пустой график
    // читается как «клиентов нет», и это враньё. Ошибка — состоянием
    // карточки с «Повторить» (этап 46 ТЗ-4).
    <ChartCard
      title={intl.get('dashboard.top_contractors.title')}
      // ВЫВОД СЛОВАМИ. Ради него блок и сделан.
      summary={data ? verdictText(data) : undefined}
      state={data === null ? 'error' : 'ready'}
      onRetry={onRetry}
      errorText={intl.get('dashboard.top_contractors.error')}
      table={{
        columns: [
          { key: 'name', label: intl.get('dashboard.top_contractors.col.contractor') },
          { key: 'revenue', label: revenueName, numeric: true, render: (row) => formatOrganizationMoney(row.revenue) },
          { key: 'sharePercent', label: intl.get('dashboard.top_contractors.col.share'), numeric: true, render: (row) => `${row.sharePercent} %` },
          { key: 'cumulativePercent', label: shareName, numeric: true, render: (row) => `${row.cumulativePercent} %` },
        ],
        rows: chartRows,
      }}
      legend={
        <>
          <ChartLegend
            items={[
              { key: 'revenue', label: revenueName, color: chartColor.ink },
              { key: 'cumulativePercent', label: shareName, color: chartColor.expense, shape: 'line' },
            ]}
          />
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {chartRows.map((row) => (
              <li
                key={`${row.contactId}-${row.name}`}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">
                  {formatOrganizationMoney(row.revenue)} · {row.sharePercent}%
                </span>
              </li>
            ))}
          </ul>
        </>
      }
    >
      {() => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartRows} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...xAxisProps} interval={0} hide />
            {/* Парето — единственный график с двумя осями (правило 8):
                деньги слева, накопительная доля справа. */}
            <YAxis yAxisId="money" {...yAxisProps} tickFormatter={formatAxisMoney} />
            <YAxis
              yAxisId="share"
              orientation="right"
              domain={[0, 100]}
              {...yAxisProps}
              width={44}
              tickFormatter={(value: number) => formatAxisPercent(value / 100)}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatValue={(value, entry) =>
                    entry.dataKey === 'cumulativePercent'
                      ? formatAxisPercent(value / 100)
                      : formatOrganizationMoney(value)
                  }
                />
              }
            />
            <Bar
              yAxisId="money"
              dataKey="revenue"
              name={revenueName}
              fill={chartColor.ink}
              radius={BAR_RADIUS}
              maxBarSize={BAR_MAX_SIZE}
              isAnimationActive={chartAnimation()}
            />
            {/* Линия накопительной доли: по ней видно, где набирается 80 %. */}
            <Line
              yAxisId="share"
              type={CURVE.series}
              dataKey="cumulativePercent"
              name={shareName}
              stroke={chartColor.expense}
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

/**
 * Фраза о концентрации.
 *
 * «Более 80 % даёт 1 клиент» звучит как статистика; «вся выручка от одного
 * клиента» — как предупреждение, которым это и является.
 */
export function verdictText(data: TopContractors): string {
  if (data.verdict === 'SINGLE_CLIENT') {
    return intl.get('dashboard.top_contractors.verdict_single');
  }
  if (data.verdict === 'EVEN') {
    return intl.get('dashboard.top_contractors.verdict_even');
  }

  const count = data.concentrationCount ?? 0;
  const key =
    data.verdict === 'HIGH_DEPENDENCE'
      ? 'dashboard.top_contractors.verdict_high'
      : 'dashboard.top_contractors.verdict_moderate';

  return intl.get(key, { count });
}

export default TopContractorsSection;
