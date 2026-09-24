import React from 'react';
import intl from 'react-intl-universal';
import {
  Bar,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DateField } from '@/components/ui/date-field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useDashboardOverview } from './useDashboardOverview';
import AttentionList from './AttentionList';
import TopContractorsSection from './TopContractorsSection';
import DirectionsProfitSection from './DirectionsProfitSection';
import { ComparisonBadge } from './ComparisonBadge';
import { DashboardPeriodKind } from './dashboardPeriod';
import {
  COMPARE_KINDS,
  CompareKind,
  DashboardCompare,
  formatBaseRange,
} from './dashboardCompare';
import type { OverviewParams } from './useOverviewParams';

/** Виды периода в переключателе — без «произвольного»: он задаётся датами. */
const PERIOD_KINDS: Array<Exclude<DashboardPeriodKind, 'custom'>> = [
  'month',
  'quarter',
  'year',
];

// Правило цвета вынесено к значку сравнения; здесь — прежнее имя для тех,
// кто ввозил его отсюда.
export { isGoodChange } from './overviewChangeTone';

interface TileProps {
  label: string;
  value: string;
  changePercent?: number | null;
  hint?: string | null;
  tone?: 'income' | 'expense';
  icon: React.ComponentType<{ className?: string }>;
  to: string;
}

/**
 * Плитка показателя. Кликабельна — ведёт туда, где число раскладывается
 * построчно (приёмка п. 2.4 ТЗ).
 */
function Tile({ label, value, changePercent, hint, tone, icon: Icon, to }: TileProps) {
  // Ноль определяем ПО ТЕКСТУ суммы: сервер отдаёт её уже отформатированной,
  // числа рядом нет. Годятся любые разделители — и «0,00 ₽», и «0.00».
  const hasValue = /[1-9]/.test(String(value ?? ''));

  return (
    <Link
      to={to}
      /*
        НЕ КАРТОЧКА. Рамка вокруг каждого показателя делала их равными по весу
        герою страницы — ленте денег, — а четыре одинаковые карточки в ряд это
        и есть типовой набор «панели показателей», который ничего не
        подчёркивает.
        Здесь показатели живут колонками на одной линии: они ПОДЧИНЕНЫ герою и
        читаются как строка сравнения периода, а не как четыре объекта.
      */
      className="group -mx-2 rounded-control px-2 py-2 transition-colors hover:bg-surface-elevated"
    >
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-text-muted" />
        <span className="truncate text-sm text-text-secondary">{label}</span>
      </div>
      <div
        className={cn(
          'text-xl font-semibold tracking-[-0.01em] tabular-nums sm:text-2xl',
          // Зелёный — только у НАСТОЯЩЕГО прихода. «0,00 ₽» зелёным значит
          // «денег не пришло, и это хорошо».
          tone === 'income' && hasValue && 'text-success',
          // РАСХОД НЕ КРАСНЫЙ. Расходы за период — работа бизнеса, а не
          // авария; красный оставлен настоящим бедам.
          tone === 'expense' && 'text-text-primary',
          (!tone || !hasValue) && 'text-text-primary',
        )}
      >
        {value}
      </div>
      {/*
        Изменение к базе сравнения. Пустая база — это не «рост на 100%», а
        «сравнивать не с чем»: значок так и пишет, процента нет (FT-061).
      */}
      <ComparisonBadge changePercent={changePercent} tone={tone} />
      {hint && <div className="mt-1 text-sm text-text-secondary">{hint}</div>}
    </Link>
  );
}

/**
 * Полоса показателей, график «Деньги по месяцам», остатки по счетам и топ
 * статей расходов (этап 2 ТЗ, блоки 1, 2, 4, 5).
 *
 * Все числа приходят ОДНИМ запросом `GET /dashboard/overview`: доходы и
 * расходы сервер берёт из отчёта о прибылях и убытках, поэтому главная и
 * раздел «Отчёты» показывают одно и то же.
 */
export default function OverviewSection({ params }: { params: OverviewParams }) {
  // ПЕРИОД, БАЗА И ПОРЯДОК НАПРАВЛЕНИЙ ЖИВУТ ВЫШЕ, в содержимом главной:
  // блок «План» читает тот же ответ, и ключи запросов обязаны совпасть —
  // иначе запросов на главной стало бы два вместо одного (п. 2.3 ТЗ).
  const {
    period,
    choosePeriod,
    compare,
    chooseCompare,
    directionsSortBy,
    setDirectionsSortBy,
  } = params;

  const { data, isLoading, isError, refetch } = useDashboardOverview(
    period,
    directionsSortBy,
    compare,
  );

  if (isLoading) {
    return (
      <section className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </section>
    );
  }

  // Сбой запроса не должен ронять всю главную: ниже ещё разделы со ссылками.
  if (isError || !data) {
    return null;
  }

  const {
    tiles,
    months,
    accounts,
    topExpenses,
    attention,
    topContractors,
    directionsProfit,
  } = data;
  const hasNumbers =
    tiles.income.amount !== 0 ||
    tiles.expenses.amount !== 0 ||
    accounts.length > 0;

  if (!hasNumbers) {
    return (
      <EmptyState
        title={intl.get('dashboard.empty.title')}
        description={intl.get('dashboard.empty.description')}
        action={
          <Link to="/cashflow-accounts">
            <Button>{intl.get('dashboard.empty.action')}</Button>
          </Link>
        }
      />
    );
  }

  const chart = months.map((row) => ({
    month: moment(row.month, 'YYYY-MM').format('MMM'),
    income: row.income,
    expenses: row.expenses,
    profit: row.profit,
  }));

  return (
    <section className="flex flex-col gap-6">
      {/* Переключатель периода: выбор запоминается между сессиями. */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIOD_KINDS.map((kind) => (
          <Button
            key={kind}
            variant={period.kind === kind ? 'primary' : 'secondary'}
            onClick={() => choosePeriod(kind)}
          >
            {intl.get(`dashboard.period.${kind}`)}
          </Button>
        ))}
      </div>

      <CompareControl compare={compare} onChange={chooseCompare} />

      {/*
        ПЛИТКИ «ДЕНЬГИ НА СЧЕТАХ» ЗДЕСЬ БОЛЬШЕ НЕТ, и на то две причины.

        Первая: она дословно повторяла число героя страницы — остаток на
        счетах уже написан крупно двумя блоками выше.

        Вторая важнее. Плитка стояла ПОД переключателем «Месяц / Квартал /
        Год», но остаток на счетах — величина на дату, а не за период: при
        любом выборе в ней было одно и то же число. Человек жал «Квартал»,
        ничего не менялось, и это читалось как поломка. Проверено на стенде:
        месяц, квартал и год давали ровно 1 749 839,09 ₽.

        Показатели ниже — настоящие величины за период, и переключатель на них
        и правда влияет.
      */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-5 lg:grid-cols-3">
        <Tile
          label={intl.get('dashboard.tile.income')}
          value={tiles.income.formattedAmount}
          changePercent={tiles.income.changePercent}
          tone="income"
          icon={ArrowUpRight}
          to="/financial-reports/profit-loss-sheet"
        />
        <Tile
          label={intl.get('dashboard.tile.expenses')}
          value={tiles.expenses.formattedAmount}
          changePercent={tiles.expenses.changePercent}
          tone="expense"
          icon={ArrowDownRight}
          to="/financial-reports/profit-loss-sheet"
        />
        <Tile
          label={intl.get('dashboard.tile.profit')}
          value={tiles.netProfit.formattedAmount}
          changePercent={tiles.netProfit.changePercent}
          hint={
            typeof tiles.netProfit.marginPercent === 'number'
              ? intl.get('dashboard.tile.margin', {
                  percent: tiles.netProfit.marginPercent,
                })
              : null
          }
          icon={TrendingUp}
          to="/financial-reports/profit-loss-sheet"
        />
      </div>

      {/* С чем сравнили — датами, которые сервер взял на самом деле. Без
          подписи «+12 %» непонятно к чему: к прошлому месяцу или к году
          назад (FT-061). */}
      {data.comparison && (
        <p className="-mt-3 text-xs text-text-muted">
          {intl.get('dashboard.compare.base', {
            range: formatBaseRange(
              data.comparison.fromDate,
              data.comparison.toDate,
              moment(period.fromDate).year(),
            ),
          })}
        </p>
      )}

      {/*
        «Требует внимания» идёт сразу под показателями: это то, ради чего
        человек открыл главную — что нужно сделать прямо сейчас.
      */}
      <AttentionList items={attention ?? []} />

      {/* Главный график продукта: доходы и расходы столбцами, прибыль линией. */}
      <div className="rounded-default border border-border bg-surface p-4">
        <h2 className="mb-3 text-base font-medium text-text-primary">
          {intl.get('dashboard.chart.title')}
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={80} />
              <Tooltip />
              <Bar
                dataKey="income"
                name={intl.get('dashboard.chart.income')}
                fill="rgb(var(--c-success))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name={intl.get('dashboard.chart.expenses')}
                fill="rgb(var(--c-danger))"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name={intl.get('dashboard.chart.profit')}
                stroke="rgb(var(--c-action))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Остатки по счетам: клик ведёт в операции этого счёта. */}
        <div className="rounded-default border border-border bg-surface p-4">
          <h2 className="mb-3 text-base font-medium text-text-primary">
            {intl.get('dashboard.accounts.title')}
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {accounts.map((account) => (
              <li key={account.id}>
                <Link
                  to={`/cashflow-accounts/${account.id}/transactions`}
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:text-action"
                >
                  <span className="truncate">{account.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {account.formattedAmount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Топ статей расходов: полосой видно долю каждой. */}
        <div className="rounded-default border border-border bg-surface p-4">
          <h2 className="mb-3 text-base font-medium text-text-primary">
            {intl.get('dashboard.top_expenses.title')}
          </h2>
          {topExpenses.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {intl.get('dashboard.top_expenses.empty')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {topExpenses.map((row) => (
                <li key={`${row.id}-${row.name}`}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="truncate">{row.name}</span>
                    <span className="shrink-0 tabular-nums text-text-secondary">
                      {row.formattedAmount} · {row.sharePercent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-elevated">
                    <div
                      className="h-2 rounded-full bg-danger"
                      style={{ width: `${Math.min(row.sharePercent, 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* «Кто приносит прибыль» и «Прибыльность направлений» (FIN-018).
          Место по ТЗ: после «Требует внимания» и до сводки по деньгам. */}
      <TopContractorsSection
        data={topContractors}
        onRetry={() => {
          refetch();
        }}
      />
      <DirectionsProfitSection
        data={directionsProfit}
        sortBy={directionsSortBy}
        onSortByChange={setDirectionsSortBy}
        onRetry={() => {
          refetch();
        }}
      />
    </section>
  );
}

/**
 * «Сравнить с» (FT-061 ТЗ-3): прошлый период · два периода назад · этот
 * период в прошлом году · свой период.
 *
 * Выпадающий список, а не четыре кнопки: подписи длинные, и на телефоне
 * ряд из них занял бы полэкрана над самими цифрами. Свой период вводится
 * полем даты продукта — в формате организации, а не браузера.
 */
function CompareControl({
  compare,
  onChange,
}: {
  compare: DashboardCompare;
  onChange: (compare: DashboardCompare) => void;
}) {
  return (
    <div className="-mt-3 flex flex-wrap items-center gap-2">
      <span className="text-sm text-text-secondary">
        {intl.get('dashboard.compare.label')}
      </span>
      <div className="w-full sm:w-64">
        <Select
          value={compare.kind}
          onValueChange={(kind) =>
            onChange(
              kind === 'custom'
                ? { kind: 'custom', fromDate: compare.fromDate, toDate: compare.toDate }
                : { kind: kind as CompareKind },
            )
          }
        >
          <SelectTrigger aria-label={intl.get('dashboard.compare.label')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMPARE_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {intl.get(`dashboard.compare.kind_${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {compare.kind === 'custom' && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <DateField
            className="w-full sm:w-44"
            value={compare.fromDate ?? ''}
            placeholder={intl.get('dashboard.compare.from')}
            onChange={(fromDate) =>
              onChange({ ...compare, fromDate: fromDate || undefined })
            }
          />
          <span className="hidden text-text-muted sm:inline">—</span>
          <DateField
            className="w-full sm:w-44"
            value={compare.toDate ?? ''}
            placeholder={intl.get('dashboard.compare.to')}
            onChange={(toDate) =>
              onChange({ ...compare, toDate: toDate || undefined })
            }
          />
        </div>
      )}
    </div>
  );
}
