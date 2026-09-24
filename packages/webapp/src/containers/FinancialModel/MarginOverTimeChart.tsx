// © 2026 Bigfin
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { formatMonthShort } from '@/utils/formatShortDate';
import { formatOrganizationNumber } from '@/utils/organizationNumber';
import { marginChartPoints } from './marginChartPoints';

export interface MarginPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number; // доля 0..1
}

export function MarginOverTimeChart({ data }: { data: MarginPoint[] }) {
  // Месяц без выручки — разрыв линии, а не «маржа 0 %» (UI-042-7 ТЗ-4).
  const points = marginChartPoints(data);
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} tickFormatter={formatMonthShort} />
          <YAxis unit="%" fontSize={12} />
          <Tooltip
            formatter={(v: any) => `${formatOrganizationNumber(v)}%`}
          />
          {/* Ломаная, а не сглаженная: сглаживание придумывает значения
              между месяцами (правило R17 ТЗ-4). */}
          <Line
            type="linear"
            dataKey="marginPct"
            stroke="var(--color-action)"
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
