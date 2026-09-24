import React from 'react';
import intl from 'react-intl-universal';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import type { TopContractors } from './useDashboardOverview';

export interface TopContractorsSectionProps {
  /** `null` — блок не посчитался: показываем состояние ошибки. */
  data: TopContractors | null;
  /** Перезапросить главную: блок не умеет запрашивать себя отдельно. */
  onRetry?: () => void;
}

/**
 * «Кто приносит прибыль» — концентрация выручки по контрагентам
 * (FIN-018 ТЗ-2).
 *
 * ЗАЧЕМ. Главная отвечала на «сколько денег» и «что горит», но не на «НА КОМ
 * ДЕРЖИТСЯ БИЗНЕС». Когда три клиента дают восемьдесят процентов выручки,
 * уход одного меняет год, и узнать об этом лучше заранее.
 *
 * ЧЕГО НЕТ У КОНКУРЕНТА. ПланФакт рисует столбцы и линию накопительной доли
 * и оставляет человека читать график. Здесь под графиком стоит фраза
 * словами. График надо уметь читать, фразу читать не надо.
 */
function TopContractorsSection({ data, onRetry }: TopContractorsSectionProps) {
  // СБОЙ БЛОКА НЕ РОНЯЕТ ГЛАВНУЮ, но и молчать нельзя: пустой график
  // читается как «клиентов нет», и это враньё.
  if (data === null) {
    return (
      <section className="rounded-default border border-border bg-surface p-4">
        <h2 className="mb-2 text-base font-medium text-text-primary">
          {intl.get('dashboard.top_contractors.title')}
        </h2>
        <p className="text-sm text-text-secondary">
          {intl.get('dashboard.top_contractors.error')}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 min-h-[44px] text-sm text-action hover:underline"
          >
            {intl.get('dashboard.top_contractors.retry')}
          </button>
        )}
      </section>
    );
  }

  // Продаж за период не было — блока нет вовсе. Пустой график с подписью
  // «0 %» выглядит поломкой, а не ответом.
  if (!data.rows.length) return null;

  const chartRows = data.rows.map((row) => ({
    ...row,
    name: row.isRest
      ? intl.get('dashboard.top_contractors.rest')
      : row.name,
  }));

  return (
    <section className="rounded-default border border-border bg-surface p-4">
      <h2 className="mb-3 text-base font-medium text-text-primary">
        {intl.get('dashboard.top_contractors.title')}
      </h2>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartRows}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} hide />
            <YAxis yAxisId="money" tick={{ fontSize: 11 }} width={48} />
            <YAxis
              yAxisId="share"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              width={36}
            />
            <Tooltip
              formatter={(value: any, key: any) =>
                key === 'cumulativePercent'
                  ? `${value}%`
                  : formatOrganizationMoney(Number(value) || 0)
              }
            />
            <Bar yAxisId="money" dataKey="revenue" fill="var(--color-action)" />
            {/* Линия накопительной доли: по ней видно, где набирается 80 %. */}
            <Line
              yAxisId="share"
              type="monotone"
              dataKey="cumulativePercent"
              stroke="var(--color-text-secondary)"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ВЫВОД СЛОВАМИ. Ради него блок и сделан. */}
      <p className="mt-3 text-sm text-text-secondary">{verdictText(data)}</p>

      <ul className="mt-3 flex flex-col divide-y divide-border">
        {chartRows.map((row) => (
          <li
            key={`${row.contactId}-${row.name}`}
            className="flex items-center justify-between gap-3 py-2 text-sm"
          >
            <span className="truncate">{row.name}</span>
            <span className="shrink-0 tabular-nums text-text-secondary">
              {formatOrganizationMoney(row.revenue)} · {row.sharePercent}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Фраза о концентрации.
 *
 * «Более 80 % даёт 1 клиент» звучит как статистика; «вся выручка от одного
 * клиента» — как предупреждение, которым это и является.
 */
export function verdictText(data: TopContractors): string {
  if (data.verdict === 'SINGLE_CLIENT') {
    return intl.get('dashboard.top_contractors.verdict_single');
  }
  if (data.verdict === 'EVEN') {
    return intl.get('dashboard.top_contractors.verdict_even');
  }

  const count = data.concentrationCount ?? 0;
  const key =
    data.verdict === 'HIGH_DEPENDENCE'
      ? 'dashboard.top_contractors.verdict_high'
      : 'dashboard.top_contractors.verdict_moderate';

  return intl.get(key, { count });
}

export default TopContractorsSection;
