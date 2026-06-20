// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import { useFinancialOverview } from '@/hooks/query/financialModel';
import { MarginOverTimeChart } from './MarginOverTimeChart';

const fmtMoney = (n: number | null | undefined) =>
  `${(n ?? 0).toLocaleString('ru-RU')} ₽`;
const fmtPct = (frac: number | null | undefined) =>
  `${Math.round((frac ?? 0) * 1000) / 10}%`;

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
    </div>
  );
}

export default function FinancialModelPage() {
  const { featureCan } = useFeatureCan();
  const today = new Date();
  const [fromDate] = React.useState(`${today.getFullYear()}-01-01`);
  const [toDate] = React.useState(today.toISOString().slice(0, 10));

  const { data } = useFinancialOverview({ fromDate, toDate });

  if (!featureCan('financial_model')) return null;

  const soon = intl.get('financial_model.metric.coming_soon');

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('financial_model.page.title')}
        </h1>
        <span className="text-sm text-muted-foreground">
          {fromDate} — {toDate}
        </span>
      </div>

      {/* 6 карточек: 2 заполнены (Фаза 1), 4 — «Скоро» (Фазы 2–4) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          label={intl.get('financial_model.metric.margin')}
          value={fmtPct(data?.margin)}
        />
        <MetricCard
          label={intl.get('financial_model.metric.revenue_per_employee')}
          value={
            data?.revenuePerEmployeeApplicable
              ? fmtMoney(data?.revenuePerEmployee)
              : intl.get('financial_model.na')
          }
        />
        <MetricCard label={intl.get('financial_model.metric.ltv')} value={soon} />
        <MetricCard label={intl.get('financial_model.metric.cac')} value={soon} />
        <MetricCard label={intl.get('financial_model.metric.romi')} value={soon} />
        <MetricCard
          label={intl.get('financial_model.metric.break_even')}
          value={soon}
        />
      </div>

      {/* График «маржа во времени» */}
      <div className="rounded-md border p-4">
        <div className="mb-2 text-sm font-medium">
          {intl.get('financial_model.chart.margin_over_time')}
        </div>
        <MarginOverTimeChart data={data?.marginOverTime ?? []} />
      </div>
    </div>
  );
}
