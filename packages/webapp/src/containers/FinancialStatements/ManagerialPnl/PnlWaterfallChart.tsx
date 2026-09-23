import React from 'react';
import intl from 'react-intl-universal';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import type { WaterfallStep } from './pnlWaterfall';
import { formatMargin } from './managerialPnlRows';

/**
 * Водопад управленческой прибыли (FT-015 ТЗ-3) над таблицей: куда уходит
 * выручка по пути к чистой прибыли.
 *
 * Итоги ярусов — цветом действия, расходы — спокойным серым: потратить
 * деньги не проблема, это работа. Красный в продукте занят тем, что
 * требует действия сегодня.
 */
export function PnlWaterfallChart({ steps }: { steps: WaterfallStep[] }) {
  const data = steps.map((step) => ({
    ...step,
    label: intl.get(step.labelKey),
  }));

  return (
    <div className="rounded-default border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        {intl.get('managerial_pnl.waterfall_title')}
      </h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 32, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              interval={0}
              angle={-25}
              textAnchor="end"
              height={60}
              tick={{ fontSize: 10 }}
            />
            <YAxis tick={{ fontSize: 11 }} width={72} />
            <Tooltip
              formatter={(_value: any, name: any, item: any) => {
                if (name !== 'height') return [null, null];
                const step: WaterfallStep = item?.payload;
                // Доля — в формате языка интерфейса, как рентабельность в
                // таблице; «н/о», когда выручки нет.
                const share = formatMargin(
                  step.shareOfRevenue === null ? '' : String(step.shareOfRevenue),
                  intl.getInitOptions?.()?.currentLocale || 'ru',
                );
                return [
                  `${formatOrganizationMoney(step.value)} · ${share} ${intl.get('managerial_pnl.waterfall_of_revenue')}`,
                  item?.payload?.label,
                ];
              }}
            />
            {/* Невидимая подставка поднимает столбик расхода на уровень, с
                которого он начинается. */}
            <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="height" stackId="w" isAnimationActive={false}>
              {data.map((step) => (
                <Cell
                  key={step.id}
                  fill={
                    step.kind === 'total' || step.kind === 'start'
                      ? 'var(--color-action)'
                      : step.kind === 'increase'
                        ? 'var(--color-text-secondary)'
                        : 'var(--color-text-muted)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
