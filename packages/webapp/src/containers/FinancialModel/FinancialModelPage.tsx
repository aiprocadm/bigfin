// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import {
  useFinancialOverview,
  useFinancialSegments,
  useMarketingMetrics,
  useBreakEven,
  MetricValue,
} from '@/hooks/query/financialModel';
import { MarginOverTimeChart } from './MarginOverTimeChart';
import { SegmentTable, ProductTable } from './SegmentTables';
import { MarketingPanel } from './MarketingPanel';
import { BreakEvenPanel } from './BreakEvenPanel';
import { formatShortDate } from '@/utils/formatShortDate';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const fmtMoney = (n: number | null | undefined) =>
  formatOrganizationMoney(n ?? 0);
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
  const flagEnabled = featureCan('financial_model');
  const today = new Date();
  const [fromDate] = React.useState(`${today.getFullYear()}-01-01`);
  const [toDate] = React.useState(today.toISOString().slice(0, 10));

  const { data } = useFinancialOverview(
    { fromDate, toDate },
    { enabled: flagEnabled },
  );
  const { data: segments } = useFinancialSegments(
    { fromDate, toDate },
    { enabled: flagEnabled },
  );
  const { data: marketing } = useMarketingMetrics(
    { fromDate, toDate },
    { enabled: flagEnabled },
  );
  const { data: breakEven } = useBreakEven(
    { fromDate, toDate },
    { enabled: flagEnabled },
  );

  if (!flagEnabled) return null;

  const na = intl.get('financial_model.na');
  const metricMoney = (m?: MetricValue) =>
    m?.applicable ? fmtMoney(m.value) : na;
  const metricRatio = (m?: MetricValue) =>
    m?.applicable ? `${Math.round(m.value * 10) / 10}×` : na;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('financial_model.page.title')}
        </h1>
        <span className="text-sm text-muted-foreground">
          {formatShortDate(fromDate)} — {formatShortDate(toDate)}
        </span>
      </div>

      {/* 6 живых карточек: маржа, выручка/сотр., LTV, CAC, ROMI, точка безубыточности */}
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
              : na
          }
        />
        <MetricCard
          label={intl.get('financial_model.metric.ltv')}
          value={metricMoney(marketing?.ltv)}
        />
        <MetricCard
          label={intl.get('financial_model.metric.cac')}
          value={metricMoney(marketing?.cacTotal)}
        />
        <MetricCard
          label={intl.get('financial_model.metric.romi')}
          value={metricRatio(marketing?.romi)}
        />
        <MetricCard
          label={intl.get('financial_model.metric.break_even')}
          value={
            breakEven?.hasFixedArticles && breakEven?.breakEven?.applicable
              ? fmtMoney(breakEven.breakEven.value)
              : na
          }
        />
      </div>

      {/* График «маржа во времени» */}
      <div className="rounded-md border p-4">
        <div className="mb-2 text-sm font-medium">
          {intl.get('financial_model.chart.margin_over_time')}
        </div>
        <MarginOverTimeChart data={data?.marginOverTime ?? []} />
      </div>

      {/* Рентабельность по сегментам (Фаза 2) */}
      <h2 className="mt-2 text-lg font-semibold">
        {intl.get('financial_model.segments.title')}
      </h2>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SegmentTable
          title={intl.get('financial_model.segment.by_deal')}
          rows={segments?.byDeal ?? []}
        />
        <SegmentTable
          title={intl.get('financial_model.segment.by_manager')}
          rows={segments?.byManager ?? []}
        />
        <SegmentTable
          title={intl.get('financial_model.segment.by_branch')}
          rows={segments?.byBranch ?? []}
        />
        <ProductTable
          title={intl.get('financial_model.segment.by_product')}
          rows={segments?.byProduct ?? []}
        />
      </div>

      {/* Маркетинг: каналы, помесячный ввод, срок жизни клиента (Фаза 3) */}
      <MarketingPanel marketing={marketing} fromDate={fromDate} toDate={toDate} />

      {/* Точка безубыточности: пометка постоянных статей + расчёт (Фаза 4) */}
      <BreakEvenPanel breakEven={breakEven} />
    </div>
  );
}
