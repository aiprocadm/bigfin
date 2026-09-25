import React from 'react';
import intl from 'react-intl-universal';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Text,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import {
  ChartCard,
  ChartTooltip,
  chartColor,
  formatAxisMoney,
  gridProps,
  xAxisProps,
  yAxisProps,
} from '@/components/ui/charts';
import type { WaterfallStep } from './pnlWaterfall';
import { formatMargin } from './managerialPnlRows';

/** Цвет ступени: итог — чернилами, приход — зелёным, расход — приглушённым. */
export const stepColor = (kind: WaterfallStep['kind']) =>
  kind === 'total' || kind === 'start'
    ? chartColor.ink
    : kind === 'increase'
      ? chartColor.income
      : chartColor.expense;

/**
 * Подпись шага под столбиком — горизонтально, в несколько строк по ширине
 * столбика (правило 6 §6.1). Было −25° и обрезано.
 */
function WrappedTick(props: any) {
  const { x, y, payload, width } = props;
  return (
    <Text
      x={x}
      y={y + 4}
      width={width}
      textAnchor="middle"
      verticalAnchor="start"
      fontSize={11}
      fill={chartColor.axis}
    >
      {payload?.value}
    </Text>
  );
}

/**
 * Водопад управленческой прибыли (C8, FT-015 ТЗ-3) над таблицей: куда
 * уходит выручка по пути к чистой прибыли.
 *
 * НАСТОЯЩИЙ ВОДОПАД (этап 46 ТЗ-4). Итоги ярусов стоят от нуля сплошными
 * столбиками, расходы «висят» ступенью вниз от предыдущего уровня — на
 * живом проходе прежний вид читался как столбики от нуля. Подписи
 * горизонтальны; на телефоне водопад встаёт вертикально — ступени строками,
 * подписи слева целиком.
 *
 * Расходы — спокойным серым: потратить деньги не проблема, это работа.
 */
export function PnlWaterfallChart({ steps }: { steps: WaterfallStep[] }) {
  const data = steps.map((step) => ({
    ...step,
    label: intl.get(step.labelKey),
  }));
  const locale = intl.getInitOptions?.()?.currentLocale || 'ru';
  const share = (step: WaterfallStep) =>
    formatMargin(step.shareOfRevenue === null ? '' : String(step.shareOfRevenue), locale);

  return (
    <ChartCard
      title={intl.get('managerial_pnl.waterfall_title')}
      collapsible={{ storageKey: 'bigfin.chart.managerial_pnl_waterfall' }}
      heightOverride={{ desktop: 280, phone: data.length * 28 + 24 }}
      table={{
        columns: [
          { key: 'label', label: intl.get('charts.col.step') },
          { key: 'value', label: intl.get('charts.col.amount'), numeric: true, render: (row) => formatOrganizationMoney(row.value) },
          { key: 'share', label: intl.get('managerial_pnl.waterfall_of_revenue'), numeric: true, render: (row) => share(row) },
        ],
        rows: data,
      }}
    >
      {({ isPhone }) => (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={isPhone ? 'vertical' : 'horizontal'}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid {...gridProps} vertical={isPhone} horizontal={!isPhone} />
            <XAxis
              {...xAxisProps}
              {...(isPhone
                ? { type: 'number' as const, tickFormatter: formatAxisMoney }
                : { dataKey: 'label', interval: 0, height: 56, tick: <WrappedTick /> })}
            />
            <YAxis
              {...yAxisProps}
              {...(isPhone
                ? { type: 'category' as const, dataKey: 'label', width: 132, interval: 0 }
                : {})}
              tickFormatter={isPhone ? (label: string) => label : formatAxisMoney}
            />
            <Tooltip
              content={
                <ChartTooltip
                  hideKeys={['base']}
                  formatValue={(_value, entry) => {
                    const step = entry.payload as unknown as WaterfallStep;
                    return `${formatOrganizationMoney(step.value)} · ${share(step)} ${intl.get('managerial_pnl.waterfall_of_revenue')}`;
                  }}
                />
              }
            />
            {/* Невидимая подставка поднимает столбик расхода на уровень, с
                которого он начинается. */}
            <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
            <Bar dataKey="height" name={intl.get('charts.col.amount')} stackId="w" isAnimationActive={false}>
              {data.map((step) => (
                <Cell key={step.id} fill={stepColor(step.kind)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
