import React from 'react';
import intl from 'react-intl-universal';
import { ForecastDay } from './mapForecast';
import { formatDay, isWeekend } from './formatDay';

const money = (amount: number): string =>
  `${amount.toLocaleString('ru-RU')} ₽`;

export function DayRow({ day }: { day: ForecastDay }) {
  const negative = day.balance < 0;
  const weekend = isWeekend(day.date);

  return (
    <div className={`border-b py-2 ${weekend ? 'bg-muted/40' : ''}`}>
      <div
        className={`flex items-center justify-between px-2 ${
          negative ? 'text-red-600 font-semibold' : ''
        }`}
      >
        <span className={weekend && !negative ? 'text-muted-foreground' : ''}>
          {formatDay(day.date)}
        </span>
        <span>
          {negative ? '🔴 ' : ''}
          {intl.get('payment_calendar.balance')}: {money(day.balance)}
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
            {money(line.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}
