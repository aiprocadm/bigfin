// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import moment from 'moment';

import {
  useExpensesAnalysis,
  type TopExpenseRow,
} from '@/hooks/query/financialModel';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatOrganizationNumber } from '@/utils/organizationNumber';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenError } from '@/components/ui/screen-error';
import { pickScreenState } from '@/components/ui/screen-state';
import { cn } from '@/lib/cn';

import {
  buildSplitRows,
  chartablePoints,
  expensesWarning,
  isMetricShown,
} from './expensesAnalysisView';

const money = (value: number | null | undefined) =>
  formatOrganizationMoney(value ?? 0);

const percent = (fraction: number | null | undefined) =>
  `${formatOrganizationNumber(Math.round((fraction ?? 0) * 1000) / 10)}%`;

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <h2 className="mb-3 text-sm font-medium text-text-muted">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Экран «Анализ расходов» (этап 9 ТЗ).
 *
 * Отвечает на три вопроса: какие расходы не зависят от продаж, куда уходят
 * деньги и при какой выручке бизнес выходит в ноль.
 *
 * Все числа считает сервер — здесь только показ. Ни одно из них не
 * пересчитывается на месте: иначе экран заспорил бы сам с собой.
 */
export default function ExpensesAnalysisPage() {
  const today = moment();
  const [fromDate] = React.useState(
    today.clone().startOf('year').format('YYYY-MM-DD'),
  );
  const [toDate] = React.useState(today.format('YYYY-MM-DD'));

  const { data, isLoading, isError, refetch } = useExpensesAnalysis({
    fromDate,
    toDate,
  });

  // Четыре состояния экрана (§5.3 ТЗ). Порядок задан общим правилом:
  // загрузка важнее ошибки, ошибка важнее пустоты.
  const screenState = pickScreenState({ isLoading, isError });

  if (screenState === 'loading') {
    return <Skeleton className="m-6 h-96 w-full" />;
  }

  if (screenState === 'error') {
    return (
      <div className="p-6">
        <ScreenError
          message={intl.get('expenses_analysis.error')}
          onRetry={() => refetch?.()}
        />
      </div>
    );
  }

  const splitRows = buildSplitRows(data?.split);
  const warning = expensesWarning(data?.split, data?.hasFixedArticles);
  const points = chartablePoints(data?.monthly);
  const na = intl.get('expenses_analysis.not_applicable');

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">
        {intl.get('expenses_analysis.page.title')}
      </h1>

      {/*
        Предупреждение стоит НАД цифрами: точка безубыточности, посчитанная
        по половине расходов, выглядит так же уверенно, как правильная.
      */}
      {warning && (
        <div className="rounded-md border border-warning bg-warning/10 p-3 text-sm">
          {intl.get(
            warning === 'no_fixed'
              ? 'expenses_analysis.warning.no_fixed'
              : 'expenses_analysis.warning.partly_unmarked',
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title={intl.get('expenses_analysis.split.title')}>
          {data?.split?.total ? (
            <div className="flex flex-col gap-2">
              {splitRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-baseline justify-between gap-4 text-sm"
                >
                  <span
                    className={cn(
                      row.key === 'unset' && 'text-text-muted italic',
                    )}
                  >
                    {intl.get(row.labelKey)}
                  </span>
                  <span className="tabular-nums">
                    {money(row.amount)} · {percent(row.share)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              {intl.get('expenses_analysis.empty')}
            </p>
          )}
        </Card>

        <Card title={intl.get('expenses_analysis.break_even.title')}>
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>{intl.get('expenses_analysis.break_even')}</span>
              <span className="tabular-nums text-lg font-semibold">
                {isMetricShown(data?.breakEven)
                  ? money(data?.breakEven?.value)
                  : na}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span>{intl.get('expenses_analysis.safety_margin')}</span>
              <span className="tabular-nums text-lg font-semibold">
                {isMetricShown(data?.safetyMargin)
                  ? percent(data?.safetyMargin?.value)
                  : na}
              </span>
            </div>
            <p className="text-sm text-text-muted">
              {intl.get('expenses_analysis.safety_margin.hint')}
            </p>
          </div>
        </Card>
      </div>

      {points.length > 0 && (
        <Card title={intl.get('expenses_analysis.share_chart.title')}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickFormatter={(month: any) =>
                    moment(String(month), 'YYYY-MM').format('MMM YY')
                  }
                />
                <YAxis tickFormatter={(value: any) => percent(value)} />
                {/* recharts типизирует подписи как ReactNode — приводим сами. */}
                <Tooltip
                  formatter={(value: any) => percent(value)}
                  labelFormatter={(month: any) =>
                    moment(String(month), 'YYYY-MM').format('MMMM YYYY')
                  }
                />
                <Line
                  type="monotone"
                  dataKey="share"
                  name={intl.get('expenses_analysis.share_chart.series')}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {(data?.topArticles?.length ?? 0) > 0 && (
        <Card title={intl.get('expenses_analysis.top.title')}>
          {/* Таблица скроллится по горизонтали на телефоне. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2">{intl.get('expenses_analysis.top.article')}</th>
                  <th className="py-2 text-right">
                    {intl.get('expenses_analysis.top.amount')}
                  </th>
                  <th className="py-2 text-right">
                    {intl.get('expenses_analysis.top.previous')}
                  </th>
                  <th className="py-2 text-right">
                    {intl.get('expenses_analysis.top.growth')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.topArticles?.map((row: TopExpenseRow) => (
                  <tr key={row.articleId} className="border-b border-border/60">
                    <td className="py-2">
                      {row.name}
                      {row.isNew && (
                        <span className="ml-2 text-xs text-text-muted">
                          {intl.get('expenses_analysis.top.new')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {money(row.amount)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-text-muted">
                      {money(row.previousAmount)}
                    </td>
                    <td
                      className={cn(
                        'py-2 text-right tabular-nums',
                        // Подсветка по ТЗ: рост больше чем на 20%.
                        row.isSharpGrowth && 'text-danger font-medium',
                      )}
                    >
                      {money(row.growthAbs)}
                      {row.growthPct != null
                        ? ` (${percent(row.growthPct)})`
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
