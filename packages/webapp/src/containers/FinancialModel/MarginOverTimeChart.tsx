// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { formatMonthShort } from '@/utils/formatShortDate';
import {
  ChartCard,
  ChartTooltip,
  chartColor,
  gridProps,
  xAxisProps,
  yAxisProps,
  formatAxisPercent,
} from '@/components/ui/charts';
import { marginChartPoints } from './marginChartPoints';

export interface MarginPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number; // доля 0..1
}

/** Маржа в процентах подписью: «12,5 %»; месяц без выручки — «н/о». */
const marginLabel = (pct: number | null) =>
  pct === null ? intl.get('financial_model.na') : formatAxisPercent(pct / 100);

/**
 * Маржинальность по месяцам (C18, этап 46 ТЗ-4): ломаная с разрывами.
 * Месяц без выручки — разрыв линии, а не «маржа 0 %» (UI-042-7).
 */
export function MarginOverTimeChart({ data }: { data: MarginPoint[] }) {
  const points = marginChartPoints(data);
  return (
    <ChartCard
      title={intl.get('financial_model.chart.margin_over_time')}
      state={points.some((p) => p.marginPct !== null) ? 'ready' : 'empty'}
      pointCount={points.length}
      table={{
        columns: [
          { key: 'month', label: intl.get('charts.col.period'), render: (row) => formatMonthShort(row.month) },
          { key: 'marginPct', label: intl.get('financial_model.metric.margin'), numeric: true, render: (row) => marginLabel(row.marginPct) },
        ],
        rows: points,
      }}
    >
      {({ xInterval }) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...xAxisProps} interval={xInterval} tickFormatter={formatMonthShort} />
            <YAxis {...yAxisProps} width={56} tickFormatter={(v: number) => formatAxisPercent(v / 100)} />
            <Tooltip
              content={
                <ChartTooltip
                  formatLabel={(label) => formatMonthShort(String(label))}
                  formatValue={(v) => marginLabel(v)}
                />
              }
            />
            {/* Ломаная, а не сглаженная: сглаживание придумывает значения
                между месяцами (правило R17 ТЗ-4). */}
            <Line
              type="linear"
              dataKey="marginPct"
              name={intl.get('financial_model.metric.margin')}
              stroke={chartColor.ink}
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
