// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';
import { useFeatureCan } from '@/hooks/state/feature';
import {
  useFinancialRatios,
  HorizontalRow,
  VerticalRow,
} from '@/hooks/query/financialRatios';
import { DateField } from '@/components/ui/date-field';
import { formatOrganizationNumber } from '@/utils/organizationNumber';

// Дата «сегодня» по местному времени: toISOString() отдаёт UTC, и ночью
// в Москве поле «по» показывало вчерашний день.
const localDate = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const today = () => localDate(new Date());

const pct = (v: number | null): string =>
  `${formatOrganizationNumber(v === null || v === undefined ? null : v * 100, {
    digits: 1,
  })}%`;
const ratio = (v: number | null): string =>
  formatOrganizationNumber(v, { digits: 2 });
// Единственная денежная плитка среди девяти — без знака валюты её путали
// с коэффициентом.
const money = (v: number): string =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(
    v ?? 0,
  )} ₽`;
const formatDate = (iso?: string): string =>
  iso ? new Intl.DateTimeFormat('ru-RU').format(new Date(`${iso}T00:00:00`)) : '';

function Card({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * ㉕ Страница «Показатели»: ключевые финансовые коэффициенты, вертикальный
 * и горизонтальный анализ ОПиУ за период. За флагом `financial_ratios`.
 */
export default function FinancialRatiosPage() {
  const { featureCan } = useFeatureCan();
  const [fromDate, setFromDate] = React.useState(yearStart());
  const [toDate, setToDate] = React.useState(today());

  const enabled = featureCan('financial_ratios');
  const { data, isLoading, isError } = useFinancialRatios(fromDate, toDate, {
    enabled,
  });

  // Раньше здесь был `return null` — по прямой ссылке пользователь видел
  // пустой белый экран без единого слова о причине.
  if (!enabled) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <h1 className="text-xl font-semibold">
          {intl.get('financial_ratios.page.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {intl.get('financial_ratios.module_off')}
        </p>
      </div>
    );
  }

  const r = data?.ratios;
  const vertical: VerticalRow[] = data?.vertical ?? [];
  // Итоговые строки («Валовая прибыль», «Чистая прибыль») отделены от
  // разделов и статей: их доли не складываются с остальными.
  const verticalSections = vertical.filter((row) => !row.isTotal);
  const verticalTotals = vertical.filter((row) => row.isTotal);
  const horizontal: HorizontalRow[] = data?.horizontal ?? [];
  const meta = data?.meta;

  // Подписи периода: балансовые показатели считаются на конечную дату
  // (остатки), прибыльные — за период. Один фильтр «с — по» это скрывал.
  const asOfHint = intl.get('financial_ratios.hint.as_of', {
    date: formatDate(meta?.asOf ?? toDate),
  });
  const periodHint = intl.get('financial_ratios.hint.period');

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {intl.get('financial_ratios.page.title')}
        </h1>
        <div className="flex items-center gap-2">
          <DateField value={fromDate} onChange={setFromDate} className="rounded border px-2 py-1 text-sm" />
          <span className="text-muted-foreground">—</span>
          <DateField value={toDate} onChange={setToDate} className="rounded border px-2 py-1 text-sm" />
        </div>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground">
          {intl.get('financial_ratios.loading')}
        </div>
      )}
      {isError && (
        <div className="text-sm text-red-600">
          {intl.get('financial_ratios.load_error')}
        </div>
      )}

      {!isLoading && !isError && r && (
        <>
          {r.equityNegative && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {intl.get('financial_ratios.negative_equity')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Card title={intl.get('financial_ratios.roe')} value={pct(r.roe)} hint={periodHint} />
            <Card title={intl.get('financial_ratios.roa')} value={pct(r.roa)} hint={periodHint} />
            <Card title={intl.get('financial_ratios.net_margin')} value={pct(r.netMargin)} hint={periodHint} />
            <Card title={intl.get('financial_ratios.current_ratio')} value={ratio(r.currentRatio)} hint={asOfHint} />
            <Card title={intl.get('financial_ratios.quick_ratio')} value={ratio(r.quickRatio)} hint={asOfHint} />
            <Card title={intl.get('financial_ratios.working_capital')} value={money(r.workingCapital)} hint={asOfHint} />
            <Card title={intl.get('financial_ratios.debt_to_equity')} value={ratio(r.debtToEquity)} hint={asOfHint} />
            <Card title={intl.get('financial_ratios.debt_ratio')} value={pct(r.debtRatio)} hint={asOfHint} />
            <Card title={intl.get('financial_ratios.equity_ratio')} value={pct(r.equityRatio)} hint={asOfHint} />
          </div>
        </>
      )}

      {!isLoading && !isError && !r && (
        <div className="text-sm text-muted-foreground">
          {intl.get('financial_ratios.empty')}
        </div>
      )}

      <div className="rounded-md border p-4">
        <h2 className="mb-1 font-medium">
          {intl.get('financial_ratios.vertical.title')}
        </h2>
        <p className="mb-2 text-xs text-muted-foreground">
          {intl.get('financial_ratios.vertical.hint')}
        </p>
        {vertical.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {intl.get('financial_ratios.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">{intl.get('financial_ratios.vertical.article')}</th>
                  <th className="py-1 text-right">{intl.get('financial_ratios.vertical.amount')}</th>
                  <th className="py-1 text-right">{intl.get('financial_ratios.vertical.share')}</th>
                </tr>
              </thead>
              <tbody>
                {/* Сначала разделы со своими статьями, потом — итоговые строки.
                    Раньше итоги стояли вперемешку с разделами, и доли выглядели
                    так, будто их можно складывать. */}
                {verticalSections.map((row) => (
                  <tr
                    key={row.key}
                    className={
                      'border-t' + (row.level ? '' : ' font-medium')
                    }
                  >
                    <td className={'py-1' + (row.level ? ' pl-6' : '')}>
                      {row.label}
                    </td>
                    <td className="py-1 text-right">{money(row.amount)}</td>
                    <td className="py-1 text-right">{pct(row.share)}</td>
                  </tr>
                ))}
                {verticalTotals.length > 0 && (
                  <tr className="border-t-2">
                    <td
                      className="text-muted-foreground pt-3 pb-1 text-[0.8125rem]"
                      colSpan={3}
                    >
                      {intl.get('financial_ratios.vertical.totals')}
                    </td>
                  </tr>
                )}
                {verticalTotals.map((row) => (
                  <tr key={row.key} className="border-t font-medium">
                    <td className="py-1">{row.label}</td>
                    <td className="py-1 text-right">{money(row.amount)}</td>
                    <td className="py-1 text-right">{pct(row.share)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Горизонтальный анализ был написан и покрыт тестами, но не доведён
          до экрана — а именно он отвечает на вопрос «мы растём или падаем?». */}
      <div className="rounded-md border p-4">
        <h2 className="mb-1 font-medium">
          {intl.get('financial_ratios.horizontal.title')}
        </h2>
        {meta && (
          <p className="mb-2 text-xs text-muted-foreground">
            {intl.get('financial_ratios.horizontal.hint', {
              from: formatDate(meta.previousFromDate),
              to: formatDate(meta.previousToDate),
            })}
          </p>
        )}
        {horizontal.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {intl.get('financial_ratios.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">{intl.get('financial_ratios.vertical.article')}</th>
                  <th className="py-1 text-right">{intl.get('financial_ratios.horizontal.current')}</th>
                  <th className="py-1 text-right">{intl.get('financial_ratios.horizontal.previous')}</th>
                  <th className="py-1 text-right">{intl.get('financial_ratios.horizontal.change')}</th>
                </tr>
              </thead>
              <tbody>
                {horizontal.map((row) => (
                  <tr key={row.key} className="border-t">
                    <td className="py-1">{row.label}</td>
                    <td className="py-1 text-right">{money(row.current)}</td>
                    <td className="py-1 text-right">{money(row.previous)}</td>
                    <td className="py-1 text-right">
                      {money(row.change)}
                      {row.changePct !== null && row.changePct !== undefined
                        ? ` (${pct(row.changePct)})`
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
