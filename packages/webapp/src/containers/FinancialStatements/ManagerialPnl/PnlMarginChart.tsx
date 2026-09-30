import React from 'react';
import intl from 'react-intl-universal';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  CURVE,
  ChartCard,
  ChartLegend,
  ChartTooltip,
  formatAxisPercent,
  gridProps,
  seriesColor,
  useHiddenSeries,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';
import { MARGIN_SERIES, type MarginPoint } from './pnlMarginSeries';

const percent = (value: number | null) =>
  value === null ? intl.get('reports.percent.not_applicable') : formatAxisPercent(value / 100);

/**
 * «Рентабельность по ярусам» (C9, UI-049-3 ТЗ-4): как менялись МД %, ВП2 %,
 * ОП % и ЧП % от месяца к месяцу. Водопад отвечает «куда ушла выручка за
 * период», эти линии — «становимся ли мы прибыльнее».
 */
export function PnlMarginChart({ points }: { points: MarginPoint[] }) {
  const { hidden, toggle } = useHiddenSeries();
  const name = (key: string) => intl.get(`managerial_pnl.margin_series.${key}`);

  return (
    <ChartCard
      title={intl.get('managerial_pnl.margin_chart_title')}
      collapsible={{ storageKey: 'bigfin.chart.managerial_pnl_margins' }}
      pointCount={points.length}
      table={{
        columns: [
          { key: 'label', label: intl.get('charts.col.period') },
          ...MARGIN_SERIES.map((key) => ({
            key,
            label: name(key),
            numeric: true,
            render: (row: MarginPoint) => percent(row[key]),
          })),
        ],
        rows: points,
      }}
      legend={
        <ChartLegend
          hidden={hidden}
          onToggle={toggle}
          items={MARGIN_SERIES.map((key, index) => ({
            key,
            label: name(key),
            color: seriesColor(index),
            shape: 'line' as const,
          }))}
        />
      }
    >
      {({ xInterval }) => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...xAxisProps} interval={xInterval} />
            <YAxis {...yAxisProps} width={56} tickFormatter={(value: number) => formatAxisPercent(value / 100)} />
            <Tooltip content={<ChartTooltip formatValue={(value) => percent(value)} />} />
            {MARGIN_SERIES.map((key, index) => (
              <Line
                key={key}
                type={CURVE.series}
                dataKey={key}
                name={name(key)}
                hide={hidden.has(key)}
                stroke={seriesColor(index)}
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
