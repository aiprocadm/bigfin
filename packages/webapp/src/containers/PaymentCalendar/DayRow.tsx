import React from 'react';
import intl from 'react-intl-universal';

interface ForecastLine {
  direction: 'inflow' | 'outflow';
  amount: number;
  label: string;
  source: string;
}
interface Day {
  date: string;
  balance: number;
  lines?: ForecastLine[];
}

export function DayRow({ day }: { day: Day }) {
  const negative = day.balance < 0;
  return (
    <div className="border-b py-2">
      <div
        className={`flex items-center justify-between px-2 ${
          negative ? 'text-red-600 font-semibold' : ''
        }`}
      >
        <span>{day.date}</span>
        <span>
          {negative ? '🔴 ' : ''}
          {intl.get('payment_calendar.balance')}:{' '}
          {day.balance.toLocaleString('ru-RU')} ₽
        </span>
      </div>
      {(day.lines ?? []).map((line, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-4 text-sm ${
            line.direction === 'inflow' ? 'text-green-600' : 'text-red-500'
          }`}
        >
          <span>{line.label}</span>
          <span>
            {line.direction === 'inflow' ? '+' : '−'}
            {line.amount.toLocaleString('ru-RU')}
          </span>
        </div>
      ))}
    </div>
  );
}
