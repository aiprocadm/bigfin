import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import moment from 'moment';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CURVE,
  ChartCard,
  ChartLegend,
  ChartTooltip,
  chartColor,
  formatAxisMoney,
  gridProps,
  seriesColor,
  useHiddenSeries,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatDayMonth } from '@/utils/formatDayMonth';

import {
  useDashboardOverview,
  type CumulativePoint,
  type HomepagePlan,
  type PlanProgress,
} from './useDashboardOverview';
import type { OverviewParams } from './useOverviewParams';
import { DirectionsPlanTable } from './DirectionsPlanTable';
import { formatPercent } from './formatPercent';

/**
 * Блок «План» на главной (FT-060, FT-062, FT-063 ТЗ-3).
 *
 * ЗАЧЕМ «ПЛАН С 1 ПО СЕГОДНЯ». 21-го числа факт почти всегда меньше плана
 * месяца — месяц ещё не кончился. Сравнение с планом целого месяца бьёт
 * ложную тревогу каждый день до последнего. Честное сравнение — с той
 * частью плана, которая уже должна была случиться: план × прошедшие дни /
 * всего дней. Эту долю считает сервер, здесь только показ.
 *
 * Данные — из того же ответа, что плитки: отдельного запроса у блока нет.
 */
export default function PlanProgressSection({
  params,
}: {
  params: OverviewParams;
}) {
  const { data, isLoading, isError } = useDashboardOverview(
    params.period,
    params.directionsSortBy,
    params.compare,
  );

  // Пока грузится или при сбое блок молчит: плитки выше уже показывают
  // скелет и ошибку, второй раз говорить о том же незачем.
  if (isLoading || isError || !data?.plan) return null;

  const { plan } = data;
  const hasProgress = Boolean(plan.income || plan.expenses);
  const cumulative = plan.cumulative ?? [];
  const hasCumulative = cumulative.some((point) => point.fact !== null);
  const hasDirections = (plan.directions?.length ?? 0) > 0;

  // Бюджет есть, но плана на период в нём нет, и показать больше нечего —
  // подсказка всё равно нужна: иначе блок просто исчез бы без объяснений.
  if (!hasProgress && !hasCumulative && !hasDirections && plan.budget) {
    return (
      <PlanFrame>
        <PlanHint budget={plan.budget} />
      </PlanFrame>
    );
  }

  return (
    <PlanFrame>
      {hasProgress ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {plan.income && (
            <ProgressCard
              title={intl.get('dashboard.plan.income')}
              progress={plan.income}
              periodFrom={data.period.fromDate}
            />
          )}
          {plan.expenses && (
            <ProgressCard
              title={intl.get('dashboard.plan.expenses')}
              progress={plan.expenses}
              periodFrom={data.period.fromDate}
            />
          )}
        </div>
      ) : (
        <PlanHint budget={plan.budget} />
      )}

      {hasCumulative && <CumulativeChart points={cumulative} />}

      <DirectionsPlanTable rows={plan.directions} />
    </PlanFrame>
  );
}

function PlanFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-default border border-border bg-surface p-4">
      <h2 className="text-base font-medium text-text-primary">
        {intl.get('dashboard.plan.title')}
      </h2>
      {children}
    </section>
  );
}

/**
 * Плана нет — объясняем, откуда он берётся. Пустой блок читался бы как
 * «план выполнен» или как поломка.
 */
function PlanHint({ budget }: { budget: HomepagePlan['budget'] }) {
  return (
    <p className="text-sm text-text-secondary">
      {budget
        ? intl.get('dashboard.plan.empty_budget', { name: budget.name })
        : intl.get('dashboard.plan.no_budget')}{' '}
      <Link
        to="/budgets"
        className="font-medium text-text-primary underline underline-offset-2"
      >
        {intl.get('dashboard.plan.open_budgets')}
      </Link>
    </p>
  );
}

/** Одна строка «подпись — сумма». */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="shrink-0 tabular-nums text-text-primary">{value}</span>
    </div>
  );
}

function ProgressCard({
  title,
  progress,
  periodFrom,
}: {
  title: string;
  progress: PlanProgress;
  periodFrom: string;
}) {
  // «По какое число» — из прошедших дней, которые посчитал сервер: так
  // подпись и сумма опираются на один и тот же день.
  const lastDay = moment(periodFrom)
    .add(Math.max(progress.elapsedDays, 1) - 1, 'days')
    .format('YYYY-MM-DD');
  const percent = progress.completionPercent;
  const bar = percent === null ? 0 : Math.min(Math.max(percent, 0), 100);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      <Row
        label={intl.get('dashboard.plan.period_plan')}
        value={formatOrganizationMoney(progress.periodPlan)}
      />
      <Row
        label={intl.get('dashboard.plan.prorated_plan', {
          from: formatDayMonth(periodFrom),
          to: formatDayMonth(lastDay),
        })}
        value={formatOrganizationMoney(progress.proratedPlan)}
      />
      <Row
        label={intl.get('dashboard.plan.fact')}
        value={formatOrganizationMoney(progress.fact)}
      />
      {/* Без плана на прошедшие дни процент не считается: делить не на что,
          и «0 %» или «∞» здесь были бы выдумкой. */}
      {percent !== null && (
        <>
          <div className="text-sm font-medium text-text-primary tabular-nums">
            {intl.get('dashboard.plan.completion', {
              percent: formatPercent(percent),
            })}
          </div>
          <div className="h-2 w-full rounded-full bg-surface-elevated">
            <div
              className="h-2 rounded-full bg-action"
              style={{ width: `${bar}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * «Догоняем или отстаём?» (FT-062): выручка нарастающим итогом по дням
 * против плана и против того же дня базы сравнения.
 *
 * Пустые точки не рисуются, а разрывают линию: после сегодняшнего дня
 * факта ещё нет, и линия «ноль» на его месте выглядела бы обвалом выручки.
 */
function CumulativeChart({ points }: { points: CumulativePoint[] }) {
  const hasPlan = points.some((point) => point.plan !== null);
  const hasPrevious = points.some((point) => point.previous !== null);
  const { hidden, toggle } = useHiddenSeries();
  const factName = intl.get('dashboard.plan.cumulative.fact');
  const planName = intl.get('dashboard.plan.cumulative.plan');
  const previousName = intl.get('dashboard.plan.cumulative.previous');
  const money = (value: number | null) => (value === null ? '—' : formatOrganizationMoney(value));

  // Цвета (этап 46 ТЗ-4): факт — главный ряд чернилами, план — приглушённым
  // пунктиром, база сравнения — второй категорией. Было три цвета «на
  // месте» и сглаженные кривые.
  return (
    <ChartCard
      title={intl.get('dashboard.plan.cumulative.title')}
      pointCount={points.length}
      table={{
        columns: [
          { key: 'date', label: intl.get('charts.col.day'), render: (row) => formatDayMonth(row.date) },
          { key: 'fact', label: factName, numeric: true, render: (row) => money(row.fact) },
          ...(hasPlan ? [{ key: 'plan', label: planName, numeric: true, render: (row: CumulativePoint) => money(row.plan) }] : []),
          ...(hasPrevious ? [{ key: 'previous', label: previousName, numeric: true, render: (row: CumulativePoint) => money(row.previous) }] : []),
        ],
        rows: points,
      }}
      legend={
        <ChartLegend
          hidden={hidden}
          onToggle={toggle}
          items={[
            { key: 'fact', label: factName, color: chartColor.ink, shape: 'line' as const },
            ...(hasPlan ? [{ key: 'plan', label: planName, color: chartColor.expense, shape: 'line' as const }] : []),
            ...(hasPrevious ? [{ key: 'previous', label: previousName, color: seriesColor(1), shape: 'line' as const }] : []),
          ]}
        />
      }
    >
      {() => (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid {...gridProps} />
            <XAxis
              dataKey="date"
              {...xAxisProps}
              tickFormatter={(value: string) => moment(value).format('D')}
              minTickGap={12}
            />
            <YAxis {...yAxisProps} tickFormatter={formatAxisMoney} />
            <Tooltip
              content={<ChartTooltip formatLabel={(label) => formatDayMonth(String(label))} />}
            />
            <Line
              type={CURVE.series}
              dataKey="fact"
              name={factName}
              hide={hidden.has('fact')}
              stroke={chartColor.ink}
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            {hasPlan && (
              <Line
                type={CURVE.series}
                dataKey="plan"
                name={planName}
                hide={hidden.has('plan')}
                stroke={chartColor.expense}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls={false}
              />
            )}
            {hasPrevious && (
              <Line
                type={CURVE.series}
                dataKey="previous"
                name={previousName}
                hide={hidden.has('previous')}
                stroke={seriesColor(1)}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
