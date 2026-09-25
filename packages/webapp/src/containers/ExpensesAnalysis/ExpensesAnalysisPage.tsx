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
  CURVE,
  ChartCard,
  ChartTooltip,
  chartColor,
  formatAxisPercent,
  gridProps,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';

import { formatMonthYear } from '@/utils/formatDayMonth';
import { formatMonthShortYear } from '@/utils/formatShortDate';

import {
  buildSplitRows,
  chartablePoints,
  expensesWarning,
  isMetricShown,
  shouldShowUnmapped,
} from './expensesAnalysisView';
import { PageTitle } from '@/components/ui/page-title';

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
    <section className="rounded-control border border-border p-4">
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
      <PageTitle>
        {intl.get('expenses_analysis.page.title')}
      </PageTitle>

      {/*
        Предупреждение стоит НАД цифрами: точка безубыточности, посчитанная
        по половине расходов, выглядит так же уверенно, как правильная.
      */}
      {warning && (
        <div className="rounded-control border border-warning bg-warning/10 p-3 text-sm">
          {intl.get(
            warning === 'no_fixed'
              ? 'expenses_analysis.warning.no_fixed'
              : 'expenses_analysis.warning.partly_unmarked',
          )}
        </div>
      )}

      {/*
        Деньги, прошедшие мимо статей. Стоят рядом с предупреждением и ВЫШЕ
        цифр по той же причине: отчёт, недосчитавший части расходов,
        выглядит так же уверенно, как полный. Раньше эта разница пропадала.
      */}
      {shouldShowUnmapped(data?.unmapped) && (
        <div className="rounded-control border border-warning bg-warning/10 p-3 text-sm">
          <p>
            {intl.get('expenses_analysis.unmapped.title', {
              count: data?.unmapped?.accountsCount ?? 0,
            })}
          </p>
          <p className="mt-1 tabular-nums text-text-secondary">
            {(data?.unmapped?.expense ?? 0) !== 0 &&
              intl.get('expenses_analysis.unmapped.expense', {
                amount: money(data?.unmapped?.expense),
              })}
            {(data?.unmapped?.expense ?? 0) !== 0 &&
              (data?.unmapped?.income ?? 0) !== 0 &&
              ' · '}
            {(data?.unmapped?.income ?? 0) !== 0 &&
              intl.get('expenses_analysis.unmapped.income', {
                amount: money(data?.unmapped?.income),
              })}
          </p>
          <p className="mt-1 text-text-muted">
            {intl.get('expenses_analysis.unmapped.hint')}
          </p>
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
        // Карточка набора графиков (этап 46 ТЗ-4, G11): цвет из палитры
        // (был цвет Recharts по умолчанию), ломаная вместо сглаженной.
        // Месяц без выручки — разрыв: точки без доли не выбрасываются, а
        // остаются пустыми, иначе линия соединяла бы соседей через пропуск.
        <ChartCard
          title={intl.get('expenses_analysis.share_chart.title')}
          pointCount={(data?.monthly ?? []).length}
          table={{
            columns: [
              { key: 'month', label: intl.get('charts.col.period'), render: (row: any) => formatMonthYear(row.month) },
              {
                key: 'share',
                label: intl.get('expenses_analysis.share_chart.series'),
                numeric: true,
                render: (row: any) => (row.share == null ? na : percent(row.share)),
              },
            ],
            rows: (data?.monthly ?? []) as any[],
          }}
        >
          {({ xInterval }) => (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.monthly ?? []}>
                <CartesianGrid {...gridProps} />
                <XAxis
                  dataKey="month"
                  {...xAxisProps}
                  interval={xInterval}
                  tickFormatter={(month: any) => formatMonthShortYear(String(month))}
                />
                <YAxis {...yAxisProps} width={56} tickFormatter={(value: any) => formatAxisPercent(value)} />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatValue={(value) => percent(value)}
                      /* БЫЛО `moment(...).format('MMMM YYYY')` и давало
                         «October 2026» в русском интерфейсе: месяц брался из
                         глобальной локали. */
                      formatLabel={(month) => formatMonthYear(String(month))}
                    />
                  }
                />
                <Line
                  type={CURVE.series}
                  dataKey="share"
                  name={intl.get('expenses_analysis.share_chart.series')}
                  stroke={chartColor.ink}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
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
