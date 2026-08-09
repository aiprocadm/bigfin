// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import {
  useVatSummary,
  VatByAccount,
  VatByRate,
} from '@/hooks/query/vatAnalysis';

const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => new Date().toISOString().slice(0, 10);

const money = (v: number): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(v ?? 0);

function Card({ title, value, accent }: { title: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={`text-2xl font-semibold ${accent ?? ''}`}>{value}</div>
    </div>
  );
}

/**
 * ㉖ Страница «Анализ НДС»: НДС начислен (с продаж) / к вычету (с покупок) /
 * к уплате за период + разбивка по налоговым счетам. За флагом `vat_analysis`.
 */
export default function VatAnalysisPage() {
  const { featureCan } = useFeatureCan();
  const [fromDate, setFromDate] = React.useState(yearStart());
  const [toDate, setToDate] = React.useState(today());

  const { data } = useVatSummary(fromDate, toDate);

  if (!featureCan('vat_analysis')) return null;

  const byAccount: VatByAccount[] = data?.byAccount ?? [];
  const byRate: VatByRate[] = data?.byRate ?? [];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('vat_analysis.page.title')}
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

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <Card title={intl.get('vat_analysis.charged')} value={money(data?.charged ?? 0)} />
        <Card title={intl.get('vat_analysis.deductible')} value={money(data?.deductible ?? 0)} />
        <Card
          title={intl.get('vat_analysis.payable')}
          value={money(data?.payable ?? 0)}
          accent={(data?.payable ?? 0) < 0 ? 'text-green-700' : ''}
        />
        {/* Налог по невозмещаемым ставкам к уплате не относится — это расход,
            поэтому он стоит отдельной плиткой, а не внутри «к вычету». */}
        <Card
          title={intl.get('vat_analysis.non_deductible')}
          value={money(data?.nonDeductible ?? 0)}
        />
      </div>

      <div className="rounded-md border p-4">
        <h2 className="mb-1 font-medium">
          {intl.get('vat_analysis.by_rate.title')}
        </h2>
        <p className="text-muted-foreground mb-2 text-sm">
          {intl.get('vat_analysis.by_rate.hint')}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="py-1">{intl.get('vat_analysis.by_rate.rate')}</th>
                <th className="py-1 text-right">
                  {intl.get('vat_analysis.by_rate.sales_base')}
                </th>
                <th className="py-1 text-right">
                  {intl.get('vat_analysis.by_rate.charged')}
                </th>
                <th className="py-1 text-right">
                  {intl.get('vat_analysis.by_rate.purchase_base')}
                </th>
                <th className="py-1 text-right">
                  {intl.get('vat_analysis.by_rate.deductible')}
                </th>
                <th className="py-1 text-right">
                  {intl.get('vat_analysis.by_rate.non_deductible')}
                </th>
              </tr>
            </thead>
            <tbody>
              {byRate.length === 0 && (
                <tr>
                  <td className="text-muted-foreground py-2" colSpan={6}>
                    {intl.get('vat_analysis.by_rate.empty')}
                  </td>
                </tr>
              )}
              {byRate.map((row) => (
                <tr key={row.taxRateId} className="border-t">
                  <td className="py-1">{row.name}</td>
                  <td className="py-1 text-right">{money(row.salesBase)}</td>
                  <td className="py-1 text-right">{money(row.charged)}</td>
                  <td className="py-1 text-right">{money(row.purchaseBase)}</td>
                  <td className="py-1 text-right">{money(row.deductible)}</td>
                  <td className="py-1 text-right">{money(row.nonDeductible)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border p-4">
        <h2 className="mb-2 font-medium">
          {intl.get('vat_analysis.by_account.title')}
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">{intl.get('vat_analysis.by_account.account')}</th>
              <th className="py-1 text-right">{intl.get('vat_analysis.charged')}</th>
              <th className="py-1 text-right">{intl.get('vat_analysis.deductible')}</th>
            </tr>
          </thead>
          <tbody>
            {byAccount.map((row) => (
              <tr key={row.accountId} className="border-t">
                <td className="py-1">{row.accountName}</td>
                <td className="py-1 text-right">{money(row.charged)}</td>
                <td className="py-1 text-right">{money(row.deductible)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
