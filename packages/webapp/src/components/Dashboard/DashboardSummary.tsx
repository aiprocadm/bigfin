import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  type LucideIcon,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';

// Форматирование сумм в рублях по-русски: «842 500 ₽».
const rub = (n: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n);

export interface SummaryMetrics {
  income: number;
  expense: number;
  profit: number;
  balance: number;
}

export interface SummaryChartPoint {
  month: string;
  income: number;
  expense: number;
}

export interface DashboardSummaryProps {
  metrics: SummaryMetrics;
  chart: SummaryChartPoint[];
  className?: string;
}

interface MetricProps {
  label: string;
  value: string;
  tone?: 'income' | 'expense';
  icon: LucideIcon;
}

const Metric = ({ label, value, tone, icon: Icon }: MetricProps) => (
  <div className="rounded-lg border border-border bg-surface p-4">
    <div className="mb-2 flex items-center justify-between gap-2">
      <span className="truncate text-sm text-text-secondary">{label}</span>
      <Icon className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
    </div>
    <div
      className={cn(
        'text-xl font-medium tabular-nums sm:text-2xl',
        tone === 'income' && 'text-success',
        tone === 'expense' && 'text-danger',
        !tone && 'text-text-primary',
      )}
    >
      {value}
    </div>
  </div>
);

export function DashboardSummary({
  metrics,
  chart,
  className,
}: DashboardSummaryProps) {
  return (
    <div className={cn('mx-auto max-w-6xl p-4 sm:p-6', className)}>
      {/*
        Строки идут через словарь: компонент жил только в витрине
        компонентов, и подписи в нём были вписаны по-русски прямо в
        разметку. На живом экране это баг — продукт обязан говорить на
        языке организации.
      */}
      <h1 className="mb-4 text-xl font-medium text-text-primary">
        {intl.get('dashboard.summary.title')}
      </h1>

      {/* Метрики: 2 колонки на телефоне, 4 на десктопе. */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label={intl.get('dashboard.summary.income')}
          value={rub(metrics.income)}
          tone="income"
          icon={ArrowUpRight}
        />
        <Metric
          label={intl.get('dashboard.summary.expenses')}
          value={rub(metrics.expense)}
          tone="expense"
          icon={ArrowDownRight}
        />
        <Metric
          label={intl.get('dashboard.summary.profit')}
          value={rub(metrics.profit)}
          icon={TrendingUp}
        />
        <Metric
          label={intl.get('dashboard.summary.balance')}
          value={rub(metrics.balance)}
          icon={Wallet}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-4 text-sm font-medium text-text-secondary">
          Доходы и расходы по месяцам
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v / 1000)}к`}
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
              />
              <Tooltip
                formatter={(v: any) => rub(Number(v))}
                cursor={{ fill: 'var(--color-surface-elevated)' }}
                contentStyle={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  color: 'var(--color-text-primary)',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'var(--color-text-secondary)' }}
              />
              <Bar
                dataKey="income"
                name={intl.get('dashboard.chart.income')}
                fill="var(--color-success)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expense"
                name={intl.get('dashboard.chart.expenses')}
                fill="var(--color-danger)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
