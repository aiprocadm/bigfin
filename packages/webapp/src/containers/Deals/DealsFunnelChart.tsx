import React from 'react';
import intl from 'react-intl-universal';
import { Bar, Cell, ComposedChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { ChartCard, ChartTooltip, chartAnimation, chartColor, yAxisProps } from '@/components/ui/charts';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import type { FunnelStep } from './dealsFunnel';

/**
 * Воронка сделок (C17, UI-051-3 ТЗ-4): ступени по статусам горизонтальными
 * полосами. Длина полосы — ЧИСЛО сделок: воронка про то, сколько дошло до
 * конца. Выручку сначала брали длиной — и при нулевой выручке полосы
 * пропадали вместе с подписями (живой проход). Сумма — словами у полосы.
 */
export function DealsFunnelChart({ steps }: { steps: FunnelStep[] }) {
  const data = steps.map((step) => ({
    ...step,
    label: intl.get(`deals.status.${step.status}`),
    caption: intl.get('deals.funnel.caption', {
      count: step.count,
      amount: formatOrganizationMoney(step.revenue),
    }),
    formattedRevenue: formatOrganizationMoney(step.revenue),
  }));
  const hasDeals = steps.some((step) => step.count > 0);

  return (
    <ChartCard
      title={intl.get('deals.funnel.title')}
      summary={intl.get('deals.funnel.summary')}
      state={hasDeals ? 'ready' : 'empty'}
      emptyText={intl.get('deals.funnel.empty')}
      heightOverride={{ desktop: data.length * 44, phone: data.length * 44 }}
      table={{
        columns: [
          { key: 'label', label: intl.get('deals.field.status') },
          { key: 'count', label: intl.get('deals.funnel.col.count'), numeric: true },
          { key: 'formattedRevenue', label: intl.get('deals.dashboard.revenue'), numeric: true },
        ],
        rows: data,
      }}
    >
      {({ isPhone }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="vertical" margin={{ top: 0, right: isPhone ? 120 : 180, bottom: 0, left: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              {...yAxisProps}
              width={96}
              tickFormatter={(label: string) => (label.length > 14 ? `${label.slice(0, 13)}…` : label)}
            />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="count"
              name={intl.get('deals.funnel.col.count')}
              // Пустая ступень — полоска в точку, а не ничего: подпись
              // «0 сделок» у неё всё равно видна.
              minPointSize={2}
              fill={chartColor.ink}
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              isAnimationActive={chartAnimation()}
            >
              {data.map((step) => (
                <Cell key={step.status} fill={step.status === 'cancelled' ? chartColor.expense : chartColor.ink} />
              ))}
              <LabelList dataKey="caption" position="right" fontSize={12} fill={chartColor.axis} />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
