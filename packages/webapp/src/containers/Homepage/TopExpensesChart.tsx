import React from 'react';
import intl from 'react-intl-universal';
import { Bar, ComposedChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  ChartCard,
  ChartTooltip,
  chartAnimation,
  chartColor,
  yAxisProps,
} from '@/components/ui/charts';
import type { OverviewExpenseShare } from './useDashboardOverview';

/**
 * «Куда уходят деньги» (C4, этап 47 ТЗ-4): топ статей расходов
 * горизонтальными полосами. Полоса — для сравнения («аренда вдвое больше
 * связи»), число и доля — рядом словами.
 */
export function TopExpensesChart({ rows }: { rows: OverviewExpenseShare[] }) {
  const data = rows.map((row) => ({ ...row, label: row.name }));
  return (
    <ChartCard
      title={intl.get('dashboard.top_expenses.title')}
      state={data.length ? 'ready' : 'empty'}
      emptyText={intl.get('dashboard.top_expenses.empty')}
      heightOverride={{ desktop: Math.max(120, data.length * 36), phone: Math.max(120, data.length * 36) }}
      table={{
        columns: [
          { key: 'name', label: intl.get('dashboard.top_expenses.col.article') },
          { key: 'formattedAmount', label: intl.get('charts.col.amount'), numeric: true },
          { key: 'sharePercent', label: intl.get('dashboard.top_contractors.col.share'), numeric: true, render: (row) => `${row.sharePercent} %` },
        ],
        rows: data,
      }}
    >
      {() => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="vertical" margin={{ top: 0, right: 96, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              {...yAxisProps}
              width={140}
              tickFormatter={(label: string) => (label.length > 20 ? `${label.slice(0, 19)}…` : label)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="amount"
              name={intl.get('charts.col.amount')}
              fill={chartColor.expense}
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              isAnimationActive={chartAnimation()}
            >
              {/* Сумма и доля — прямо у полосы: сравнить длину и прочитать
                  число можно одним взглядом, без наведения. */}
              <LabelList
                dataKey="formattedAmount"
                position="right"
                fontSize={12}
                fill={chartColor.axis}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
