import React from 'react';
import intl from 'react-intl-universal';
import { useQuery } from 'react-query';
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

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatMonthShortYear } from '@/utils/formatShortDate';
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
  gridProps,
  useHiddenSeries,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';

export type ReportChartKind = 'profit_loss' | 'cash_flow';

interface ReportChartPoint {
  month: string;
  first: number;
  second: number;
}

interface ReportChartProps {
  kind: ReportChartKind;
  fromDate?: string;
  toDate?: string;
}

/**
 * График над таблицей отчёта (этап 4 ТЗ, п. 4.2).
 *
 * Ряды считает сервер: график обязан показывать ровно те же числа, что
 * таблица под ним. Отдельная лёгкая ручка — сам отчёт тяжёлый, и грузить его
 * второй раз ради двенадцати столбцов незачем.
 *
 * У ОПиУ столбцы — выручка, линия — прибыль. У ДДС столбцы — поступления и
 * выплаты.
 *
 * Этап 46 ТЗ-4 (G5): выплаты больше не красные (красный — только проблема),
 * линия прибыли — ломаная, оси — «1,6 млн ₽», есть «Таблица»; над отчётом
 * график сворачивается — главное на экране таблица.
 */
export default function ReportChart({
  kind,
  fromDate,
  toDate,
}: ReportChartProps) {
  const apiRequest = useApiRequest();

  const { hidden, toggle } = useHiddenSeries();
  const { data, isLoading, isError, refetch } = useQuery(
    ['REPORT_CHART', kind, fromDate, toDate],
    () =>
      apiRequest
        .get('financial-reports/chart', {
          params: { report: kind, from: fromDate, to: toDate },
        })
        .then((res: any) => transformToCamelCase(res.data)),
    { enabled: Boolean(fromDate && toDate), keepPreviousData: true },
  );

  const points: ReportChartPoint[] = (data as any)?.points ?? [];
  const hasNumbers = points.some(
    (point) => point.first !== 0 || point.second !== 0,
  );

  // Пустой график ничего не сообщает — за период просто нет движений.
  if (!isLoading && !isError && !hasNumbers) return null;

  const rows = points.map((point) => ({
    month: formatMonthShortYear(point.month),
    first: point.first,
    second: point.second,
  }));

  const isCashFlow = kind === 'cash_flow';
  const firstName = intl.get(
    isCashFlow ? 'reports.chart.money_in' : 'reports.chart.revenue',
  );
  const secondName = intl.get(
    isCashFlow ? 'reports.chart.money_out' : 'reports.chart.profit',
  );
  const secondColor = isCashFlow ? chartColor.expense : chartColor.ink;

  return (
    <ChartCard
      className="mb-4"
      title={intl.get(isCashFlow ? 'reports.chart.title.cash_flow' : 'reports.chart.title.profit_loss')}
      state={isLoading ? 'loading' : isError ? 'error' : 'ready'}
      onRetry={() => refetch()}
      collapsible={{ storageKey: `bigfin.chart.report.${kind}` }}
      pointCount={rows.length}
      table={{
        columns: [
          { key: 'month', label: intl.get('charts.col.period') },
          { key: 'first', label: firstName, numeric: true, render: (row) => formatOrganizationMoney(row.first) },
          { key: 'second', label: secondName, numeric: true, render: (row) => formatOrganizationMoney(row.second) },
        ],
        rows,
      }}
      legend={
        <ChartLegend
          hidden={hidden}
          onToggle={toggle}
          items={[
            { key: 'first', label: firstName, color: chartColor.income },
            { key: 'second', label: secondName, color: secondColor, shape: isCashFlow ? 'dot' : 'line' },
          ]}
        />
      }
    >
      {({ xInterval }) => (
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" {...xAxisProps} interval={xInterval} />
            <YAxis {...yAxisProps} tickFormatter={formatAxisMoney} />
            <Tooltip content={<ChartTooltip />} />
            <Bar
              dataKey="first"
              name={firstName}
              hide={hidden.has('first')}
              fill={chartColor.income}
              radius={BAR_RADIUS}
              maxBarSize={BAR_MAX_SIZE}
              isAnimationActive={chartAnimation()}
            />
            {isCashFlow ? (
              <Bar
                dataKey="second"
                name={secondName}
                hide={hidden.has('second')}
                fill={secondColor}
                radius={BAR_RADIUS}
                maxBarSize={BAR_MAX_SIZE}
                isAnimationActive={chartAnimation()}
              />
            ) : (
              <Line
                type={CURVE.series}
                dataKey="second"
                name={secondName}
                hide={hidden.has('second')}
                stroke={secondColor}
                strokeWidth={2}
                dot={false}
                isAnimationActive={chartAnimation()}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
