import type { Meta, StoryObj } from '@storybook/react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import {
  BAR_MAX_SIZE,
  BAR_RADIUS,
  CURVE,
  ChartCard,
  ChartLegend,
  ChartTooltip,
  chartColor,
  formatAxisMoney,
  gridProps,
  xAxisProps,
  yAxisProps,
} from './index';

/**
 * Общий набор графиков (этап 46 ТЗ-4). Карточка с вопросом, выводом,
 * «График / Таблица», оси «тыс./млн ₽», расход — приглушённым, не красным.
 */
const rows = [
  { month: 'янв', income: 1_200_000, expenses: 900_000, profit: 300_000 },
  { month: 'фев', income: 1_450_000, expenses: 1_100_000, profit: 350_000 },
  { month: 'мар', income: 980_000, expenses: 1_050_000, profit: -70_000 },
  { month: 'апр', income: 1_600_000, expenses: 1_000_000, profit: 600_000 },
];

const meta = {
  title: 'UI/Графики/ChartCard',
  component: ChartCard,
} satisfies Meta<typeof ChartCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const table = {
  columns: [
    { key: 'month', label: 'Период' },
    { key: 'income', label: 'Доходы', numeric: true },
    { key: 'expenses', label: 'Расходы', numeric: true },
    { key: 'profit', label: 'Прибыль', numeric: true },
  ],
  rows,
};

export const MoneyByMonths: Story = {
  args: { title: 'Деньги по месяцам', table, children: () => null },
  render: () => (
    <div className="bigfin-ui max-w-3xl p-4">
      <ChartCard
        title="Деньги по месяцам"
        summary="В марте расходы превысили доходы на 70 тыс. ₽"
        table={table}
        pointCount={rows.length}
        legend={
          <ChartLegend
            items={[
              { key: 'income', label: 'Доходы', color: chartColor.income },
              { key: 'expenses', label: 'Расходы', color: chartColor.expense },
              { key: 'profit', label: 'Прибыль', color: chartColor.ink, shape: 'line' },
            ]}
          />
        }
      >
        {() => (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="month" {...xAxisProps} />
              <YAxis {...yAxisProps} tickFormatter={formatAxisMoney} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="income" name="Доходы" fill={chartColor.income} radius={BAR_RADIUS} maxBarSize={BAR_MAX_SIZE} />
              <Bar dataKey="expenses" name="Расходы" fill={chartColor.expense} radius={BAR_RADIUS} maxBarSize={BAR_MAX_SIZE} />
              <Line type={CURVE.series} dataKey="profit" name="Прибыль" stroke={chartColor.ink} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  ),
};

export const States: Story = {
  args: { title: 'Деньги по месяцам', table, children: () => null },
  render: () => (
    <div className="bigfin-ui flex max-w-3xl flex-col gap-4 p-4">
      <ChartCard title="Загрузка" table={table} state="loading">{() => null}</ChartCard>
      <ChartCard title="Пусто" table={table} state="empty">{() => null}</ChartCard>
      <ChartCard title="Ошибка" table={table} state="error" onRetry={() => {}}>{() => null}</ChartCard>
      <ChartCard title="Свёрнут" table={table} collapsible={{ storageKey: 'story.collapsed', defaultCollapsed: true }}>{() => null}</ChartCard>
    </div>
  ),
};
