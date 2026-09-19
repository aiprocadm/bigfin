import React from 'react';
import intl from 'react-intl-universal';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import moment from 'moment';

import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

import { useDashboardOverview } from './useDashboardOverview';
import AttentionList from './AttentionList';
import {
  DashboardPeriod,
  DashboardPeriodKind,
  defaultPeriod,
  periodRange,
  readStoredPeriod,
  storePeriod,
} from './dashboardPeriod';

/** Виды периода в переключателе — без «произвольного»: он задаётся датами. */
const PERIOD_KINDS: Array<Exclude<DashboardPeriodKind, 'custom'>> = [
  'month',
  'quarter',
  'year',
];

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
  return (
    <Link
      to={to}
      className="rounded-default border border-border bg-surface p-4 transition-colors hover:border-action hover:bg-surface-elevated"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm text-text-secondary">{label}</span>
        <Icon className="h-4 w-4 shrink-0 text-text-muted" />
      </div>
      <div
        className={cn(
          'text-xl font-semibold tracking-[-0.01em] tabular-nums sm:text-2xl',
          tone === 'income' && 'text-success',
          tone === 'expense' && 'text-danger',
          !tone && 'text-text-primary',
        )}
      >
        {value}
      </div>
      {/*
        Изменение показываем, только когда есть с чем сравнивать: пустой
        прошлый период — это не «рост на 100%», а «сравнивать не с чем».
      */}
      {typeof changePercent === 'number' && (
        <div
          className={cn(
            'mt-1 text-sm tabular-nums',
            changePercent >= 0 ? 'text-success' : 'text-danger',
          )}
        >
          {changePercent >= 0 ? '+' : ''}
          {changePercent}%
        </div>
      )}
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
export default function OverviewSection() {
  const storage = typeof window !== 'undefined' ? window.localStorage : undefined;

  const [period, setPeriod] = React.useState<DashboardPeriod>(() =>
    readStoredPeriod(storage),
  );

  const choosePeriod = (kind: Exclude<DashboardPeriodKind, 'custom'>) => {
    const next = { kind, ...periodRange(kind) };
    setPeriod(next);
    storePeriod(storage, next);
  };

  const { data, isLoading, isError } = useDashboardOverview(period);

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

  const { tiles, months, accounts, topExpenses, attention } = data;
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label={intl.get('dashboard.tile.cash')}
          value={tiles.cashBalance.formattedAmount}
          icon={Wallet}
          to="/cashflow-accounts"
        />
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
    </section>
  );
}
