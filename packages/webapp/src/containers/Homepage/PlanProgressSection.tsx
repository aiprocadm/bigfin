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

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
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
import { planRings } from './planRings';
import { ProgressRing, formatShare } from '@/components/ui/progress';

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
      {hasProgress && <PlanRings plan={plan} />}
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
  // Карточка «Задайте план» вместо пустого графика (UI-047-2 ТЗ-4): на
  // живом проходе первым на главной стоял пустой график плана со шкалой
  // 0–4 (O8, G4). Одна строка «что сюда попадёт» и одна кнопка.
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-body text-text-secondary">
        {budget
          ? intl.get('dashboard.plan.empty_budget', { name: budget.name })
          : intl.get('dashboard.plan.no_budget')}
      </p>
      {/* Кнопка внутри ссылки, а не ссылка в виде кнопки: общий сброс
          красит ссылки цветом текста, и белая подпись на чернильной кнопке
          пропадала (живой проход этапа 47). */}
      <Link to="/budgets" className="no-underline">
        <Button>{intl.get('dashboard.plan.open_budgets')}</Button>
      </Link>
    </div>
  );
}

/**
 * Кольца плана (C2, R19): «идём по плану?» за секунду. Три кольца —
 * доходы, расходы, прибыль, доля плана «с 1-го по сегодня»; справа — те же
 * числа словами. Нет плана у кольца — «нет плана», не «0 %».
 */
function PlanRings({ plan }: { plan: HomepagePlan }) {
  const rings = planRings(plan);
  const tone = { income: 'chart-2', expenses: 'chart-3', profit: 'chart-1' } as const;
  // Классы целиком, а не склейкой: Tailwind создаёт только то, что видит
  // в исходнике буквально.
  const dot = { income: 'bg-chart-2', expenses: 'bg-chart-3', profit: 'bg-chart-1' } as const;
  const label = (key: string) => intl.get(`dashboard.plan.ring.${key}`);
  return (
    <div className="flex items-center gap-5">
      <ProgressRing
        size={112}
        rings={rings.map((ring) => ({ label: label(ring.key), value: ring.value, tone: tone[ring.key] }))}
      />
      <ul className="flex min-w-0 flex-col gap-1.5">
        {rings.map((ring) => (
          <li key={ring.key} className="flex items-center gap-2 text-subhead">
            <span aria-hidden className={cn('inline-block h-2 w-2 shrink-0 rounded-full', dot[ring.key])} />
            <span className="text-text-secondary">{label(ring.key)}</span>
            <span className="font-semibold tabular-nums text-text-primary">{formatShare(ring.value)}</span>
          </li>
        ))}
        <li className="text-footnote text-text-muted">{intl.get('dashboard.plan.ring.hint')}</li>
      </ul>
    </div>
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
      // Внутри карточки «План» — без второй рамки: карточка в карточке.
      className="border-0 p-0"
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
