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

import { CashFlowChartPoint } from './cashFlowArticlesChart';

export interface CashFlowChartProps {
  series: CashFlowChartPoint[];
}

/**
 * График над отчётом «Деньги (ДДС по статьям)» (T-14 ТЗ-2).
 *
 * ОТВЕЧАЕТ НА ОДИН ВОПРОС: откуда взялось движение денег за период.
 * Операционная деятельность — обычная работа, инвестиционная — покупки
 * надолго, финансовая — кредиты и деньги собственника. Таблица под ним
 * раскладывает то же самое построчно.
 *
 * ЧИСЛА ПРИХОДЯТ ГОТОВЫМИ ИЗ СТРОК ТАБЛИЦЫ. Своего запроса у графика нет:
 * он был бы вторым источником тех же сумм, а расхождение картинки с
 * цифрами дороже отсутствия картинки.
 *
 * ОТТОК НЕ КРАСНЫЙ. Красный в продукте занят проблемами, которые требуют
 * действия сегодня. Потратить деньги — это не проблема, это работа;
 * отрицательный столбик и так смотрит вниз.
 */
export function CashFlowChart({ series }: CashFlowChartProps) {
  return (
    <div className="mb-4 rounded-default border border-border bg-surface p-4">
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
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={64} />
            <Tooltip
              formatter={(value: any) =>
                formatOrganizationMoney(Number(value) || 0)
              }
            />
            <Bar dataKey="amount">
              {series.map((point) => (
                <Cell
                  key={point.name}
                  fill={
                    point.amount < 0
                      ? 'var(--c-text-muted)'
                      : 'var(--c-action)'
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
