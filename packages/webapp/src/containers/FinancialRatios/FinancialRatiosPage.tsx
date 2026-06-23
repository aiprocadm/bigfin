// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import {
  useFinancialRatios,
  VerticalRow,
} from '@/hooks/query/financialRatios';

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

const pct = (v: number | null): string =>
  v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`;
const ratio = (v: number | null): string =>
  v === null || v === undefined ? '—' : v.toFixed(2);
const money = (v: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v ?? 0);

function Card({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * ㉕ Страница «Показатели»: ключевые финансовые коэффициенты + вертикальный
 * анализ ОПиУ за период. За флагом `financial_ratios`.
 */
export default function FinancialRatiosPage() {
  const { featureCan } = useFeatureCan();
  const [fromDate, setFromDate] = React.useState(yearStart());
  const [toDate, setToDate] = React.useState(today());

  const { data } = useFinancialRatios(fromDate, toDate);

  if (!featureCan('financial_ratios')) return null;

  const r = data?.ratios;
  const vertical: VerticalRow[] = data?.vertical ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('financial_ratios.page.title')}
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded border px-2 py-1 text-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span className="text-muted-foreground">—</span>
          <input
            type="date"
            className="rounded border px-2 py-1 text-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {r && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Card title={intl.get('financial_ratios.roe')} value={pct(r.roe)} />
          <Card title={intl.get('financial_ratios.roa')} value={pct(r.roa)} />
          <Card title={intl.get('financial_ratios.net_margin')} value={pct(r.netMargin)} />
          <Card title={intl.get('financial_ratios.current_ratio')} value={ratio(r.currentRatio)} />
          <Card title={intl.get('financial_ratios.quick_ratio')} value={ratio(r.quickRatio)} />
          <Card title={intl.get('financial_ratios.working_capital')} value={money(r.workingCapital)} />
          <Card title={intl.get('financial_ratios.debt_to_equity')} value={ratio(r.debtToEquity)} />
          <Card title={intl.get('financial_ratios.debt_ratio')} value={pct(r.debtRatio)} />
          <Card title={intl.get('financial_ratios.equity_ratio')} value={pct(r.equityRatio)} />
        </div>
      )}

      <div className="rounded-md border p-4">
        <h2 className="mb-2 font-medium">
          {intl.get('financial_ratios.vertical.title')}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">{intl.get('financial_ratios.vertical.article')}</th>
              <th className="py-1 text-right">{intl.get('financial_ratios.vertical.amount')}</th>
              <th className="py-1 text-right">{intl.get('financial_ratios.vertical.share')}</th>
            </tr>
          </thead>
          <tbody>
            {vertical.map((row) => (
              <tr key={row.key} className="border-t">
                <td className="py-1">{row.label}</td>
                <td className="py-1 text-right">{money(row.amount)}</td>
                <td className="py-1 text-right">{pct(row.share)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
