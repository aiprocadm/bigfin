import React from 'react';
import intl from 'react-intl-universal';
import { useQuery } from 'react-query';
import moment from 'moment';
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
import { Skeleton } from '@/components/ui/skeleton';

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
 */
export default function ReportChart({
  kind,
  fromDate,
  toDate,
}: ReportChartProps) {
  const apiRequest = useApiRequest();

  const { data, isLoading, isError } = useQuery(
    ['REPORT_CHART', kind, fromDate, toDate],
    () =>
      apiRequest
        .get('financial-reports/chart', {
          params: { report: kind, from: fromDate, to: toDate },
        })
        .then((res: any) => transformToCamelCase(res.data)),
    { enabled: Boolean(fromDate && toDate), keepPreviousData: true },
  );

  if (isLoading) {
    return <Skeleton className="mb-4 h-56 w-full" />;
  }

  // Сбой графика не должен закрывать таблицу: цифры важнее картинки.
  if (isError || !data) return null;

  const points: ReportChartPoint[] = (data as any).points ?? [];
  const hasNumbers = points.some(
    (point) => point.first !== 0 || point.second !== 0,
  );

  // Пустой график ничего не сообщает — за период просто нет движений.
  if (!hasNumbers) return null;

  const rows = points.map((point) => ({
    month: moment(point.month, 'YYYY-MM').format('MMM YY'),
    first: point.first,
    second: point.second,
  }));

  const firstName = intl.get(
    kind === 'profit_loss'
      ? 'reports.chart.revenue'
      : 'reports.chart.money_in',
  );
  const secondName = intl.get(
    kind === 'profit_loss' ? 'reports.chart.profit' : 'reports.chart.money_out',
  );

  return (
    <div className="mb-4 rounded-default border border-border bg-surface p-4">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={80} />
            <Tooltip />
            <Bar
              dataKey="first"
              name={firstName}
              fill="rgb(var(--c-success))"
              radius={[4, 4, 0, 0]}
            />
            {kind === 'cash_flow' ? (
              <Bar
                dataKey="second"
                name={secondName}
                fill="rgb(var(--c-danger))"
                radius={[4, 4, 0, 0]}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="second"
                name={secondName}
                stroke="rgb(var(--c-action))"
                strokeWidth={2}
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
