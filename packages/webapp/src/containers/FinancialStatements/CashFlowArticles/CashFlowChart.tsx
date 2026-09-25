import React from 'react';
import intl from 'react-intl-universal';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import {
  BAR_MAX_SIZE,
  BAR_RADIUS,
  ChartCard,
  ChartLegend,
  ChartTooltip,
  chartAnimation,
  chartColor,
  formatAxisMoney,
  gridProps,
  useHiddenSeries,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';

import { CashFlowPeriodPoint } from './cashFlowArticlesChart';

export interface CashFlowChartProps {
  series: CashFlowPeriodPoint[];
}

/**
 * График над отчётом «Деньги (ДДС по статьям)» (C7).
 *
 * ОТВЕЧАЕТ НА ОДИН ВОПРОС: как шли деньги по периодам — сколько пришло и
 * сколько ушло в каждом месяце (FT-001 ТЗ-3). Таблица под ним раскладывает
 * то же самое по статьям.
 *
 * ЧИСЛА ПРИХОДЯТ ГОТОВЫМИ ИЗ СТРОК ТАБЛИЦЫ. Своего запроса у графика нет:
 * он был бы вторым источником тех же сумм, а расхождение картинки с
 * цифрами дороже отсутствия картинки.
 *
 * ГЛАВНОЕ НА ЭКРАНЕ — ТАБЛИЦА (архетип «Отчёт», §8 ТЗ-4). График занимал
 * весь первый экран, и таблица начиналась ниже края (O9, G8). Теперь он
 * сворачивается и на телефоне и низком ноутбуке свёрнут сразу; выбор
 * человека запоминается.
 *
 * ВЫПЛАТЫ НЕ КРАСНЫЕ. Красный в продукте занят проблемами, которые требуют
 * действия сегодня. Потратить деньги — это не проблема, это работа.
 */
export function CashFlowChart({ series }: CashFlowChartProps) {
  const { hidden, toggle } = useHiddenSeries();
  const inflow = intl.get('cash_flow_articles.inflow');
  const outflow = intl.get('cash_flow_articles.outflow');

  return (
    <ChartCard
      title={intl.get('cash_flow_articles.chart_title')}
      collapsible={{ storageKey: 'bigfin.chart.cash_flow_articles' }}
      pointCount={series.length}
      table={{
        columns: [
          { key: 'label', label: intl.get('charts.col.period') },
          { key: 'inflow', label: inflow, numeric: true, render: (row) => formatOrganizationMoney(row.inflow) },
          { key: 'outflow', label: outflow, numeric: true, render: (row) => formatOrganizationMoney(row.outflow) },
        ],
        rows: series,
      }}
      legend={
        <ChartLegend
          hidden={hidden}
          onToggle={toggle}
          items={[
            { key: 'inflow', label: inflow, color: chartColor.income },
            { key: 'outflow', label: outflow, color: chartColor.expense },
          ]}
        />
      }
    >
      {({ xInterval }) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...xAxisProps} interval={xInterval} />
            <YAxis {...yAxisProps} tickFormatter={formatAxisMoney} />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="inflow"
              name={inflow}
              hide={hidden.has('inflow')}
              fill={chartColor.income}
              radius={BAR_RADIUS}
              maxBarSize={BAR_MAX_SIZE}
              isAnimationActive={chartAnimation()}
            />
            <Bar
              dataKey="outflow"
              name={outflow}
              hide={hidden.has('outflow')}
              fill={chartColor.expense}
              radius={BAR_RADIUS}
              maxBarSize={BAR_MAX_SIZE}
              isAnimationActive={chartAnimation()}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
