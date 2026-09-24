import React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import moment from 'moment';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-text-primary">
        {intl.get('dashboard.plan.cumulative.title')}
      </h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => moment(value).format('D')}
              minTickGap={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={80}
              tickFormatter={(value: number) =>
                new Intl.NumberFormat(
                  intl.getInitOptions?.()?.currentLocale || 'ru',
                  { notation: 'compact', maximumFractionDigits: 1 },
                ).format(value)
              }
            />
            <Tooltip
              labelFormatter={(label) => formatDayMonth(String(label))}
              formatter={(value) => formatOrganizationMoney(Number(value))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="fact"
              name={intl.get('dashboard.plan.cumulative.fact')}
              stroke="rgb(var(--c-success))"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
            {hasPlan && (
              <Line
                type="monotone"
                dataKey="plan"
                name={intl.get('dashboard.plan.cumulative.plan')}
                stroke="rgb(var(--c-action))"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls={false}
              />
            )}
            {hasPrevious && (
              <Line
                type="monotone"
                dataKey="previous"
                name={intl.get('dashboard.plan.cumulative.previous')}
                stroke="rgb(var(--c-text-muted))"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
