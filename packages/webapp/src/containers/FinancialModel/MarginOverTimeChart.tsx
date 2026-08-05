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

export interface MarginPoint {
  month: string;
  revenue: number;
  profit: number;
  margin: number; // доля 0..1
}

export function MarginOverTimeChart({ data }: { data: MarginPoint[] }) {
  const points = (data ?? []).map((p) => ({
    month: p.month,
    marginPct: Math.round((p.margin ?? 0) * 1000) / 10, // % с 1 знаком
  }));
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" fontSize={12} tickFormatter={formatMonthShort} />
          <YAxis unit="%" fontSize={12} />
          <Tooltip formatter={(v: any) => `${v}%`} />
          <Line
            type="monotone"
            dataKey="marginPct"
            stroke="#e0a800"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
