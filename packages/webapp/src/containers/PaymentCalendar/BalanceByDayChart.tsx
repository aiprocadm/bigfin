import React from 'react';
import intl from 'react-intl-universal';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatDayMonth } from '@/utils/formatDayMonth';
import {
  CURVE,
  ChartCard,
  ChartTooltip,
  chartColor,
  formatAxisMoney,
  gridProps,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';
import type { ForecastDay } from './mapForecast';
import { uiLocale } from '@/utils/formatShortDate';

/** «25 сент.» — подпись оси: полное «25 сентября» не помещалось рядом. */
const shortDay = (iso: string) =>
  new Intl.DateTimeFormat(uiLocale(), { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`));

/**
 * «Остаток по дням» над списком календаря (C11, UI-050-1 ТЗ-4).
 *
 * Ступенькой (R17): остаток меняется в день платежа и держится до
 * следующего — наклонная линия придумала бы «плавное» таяние денег. Линия
 * нуля — цветом проблемы: всё, что ниже, — кассовый разрыв.
 */
export function BalanceByDayChart({ days }: { days: ForecastDay[] }) {
  const hasGap = days.some((day) => day.balance < 0);
  const first = days.find((day) => day.balance < 0);

  return (
    <ChartCard
      title={intl.get('payment_calendar.chart.title')}
      summary={
        first
          ? intl.get('payment_calendar.chart.gap', {
              date: formatDayMonth(first.date),
              amount: formatOrganizationMoney(Math.abs(first.balance)),
            })
          : intl.get('payment_calendar.chart.ok')
      }
      pointCount={days.length}
      table={{
        columns: [
          { key: 'date', label: intl.get('charts.col.day'), render: (row) => formatDayMonth(row.date) },
          { key: 'balance', label: intl.get('payment_calendar.balance'), numeric: true, render: (row) => formatOrganizationMoney(row.balance) },
        ],
        rows: days,
      }}
    >
      {({ xInterval }) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={days}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="date"
              {...xAxisProps}
              interval={xInterval}
              minTickGap={24}
              tickFormatter={(value: string) => shortDay(value)}
            />
            <YAxis {...yAxisProps} tickFormatter={formatAxisMoney} />
            <Tooltip content={<ChartTooltip formatLabel={(label) => formatDayMonth(String(label))} />} />
            {hasGap && <ReferenceLine y={0} stroke={chartColor.problem} strokeDasharray="4 4" />}
            <Line
              type={CURVE.balance}
              dataKey="balance"
              name={intl.get('payment_calendar.balance')}
              stroke={chartColor.ink}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
