import React from 'react';
import intl from 'react-intl-universal';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatOrganizationMoney } from '@/utils/organizationMoney';

import { CashFlowPeriodPoint } from './cashFlowArticlesChart';

export interface CashFlowChartProps {
  series: CashFlowPeriodPoint[];
}

/**
 * График над отчётом «Деньги (ДДС по статьям)».
 *
 * ОТВЕЧАЕТ НА ОДИН ВОПРОС: как шли деньги по периодам — сколько пришло и
 * сколько ушло в каждом месяце (FT-001 ТЗ-3). Таблица под ним раскладывает
 * то же самое по статьям.
 *
 * ЧИСЛА ПРИХОДЯТ ГОТОВЫМИ ИЗ СТРОК ТАБЛИЦЫ. Своего запроса у графика нет:
 * он был бы вторым источником тех же сумм, а расхождение картинки с
 * цифрами дороже отсутствия картинки.
 *
 * ВЫПЛАТЫ НЕ КРАСНЫЕ. Красный в продукте занят проблемами, которые требуют
 * действия сегодня. Потратить деньги — это не проблема, это работа.
 */
export function CashFlowChart({ series }: CashFlowChartProps) {
  return (
    <div className="rounded-default border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-medium text-text-secondary">
        {intl.get('cash_flow_articles.chart_title')}
      </h2>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={series}
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={64} />
            <Tooltip
              formatter={(value: any) =>
                formatOrganizationMoney(Number(value) || 0)
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="inflow"
              name={intl.get('cash_flow_articles.inflow')}
              fill="var(--color-action)"
            />
            <Bar
              dataKey="outflow"
              name={intl.get('cash_flow_articles.outflow')}
              fill="var(--color-text-muted)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
