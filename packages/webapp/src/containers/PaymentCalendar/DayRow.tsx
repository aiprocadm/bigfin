import React from 'react';
import intl from 'react-intl-universal';
import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForecastDay, ForecastLine } from './mapForecast';
import { formatDay, isWeekend } from './formatDay';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

const money = (amount: number): string =>
  formatOrganizationMoney(amount);

export function DayRow({
  day,
  onMaterialize,
}: {
  day: ForecastDay;
  /** Записать плановую строку в учёт (О3): строка + дата вхождения. */
  onMaterialize?: (line: ForecastLine, date: string) => void;
}) {
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
          <span className="flex items-center gap-2">
            {line.direction === 'inflow' ? '+' : '−'}
            {money(line.amount)}
            {line.plannedOperationId != null && onMaterialize && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-muted-foreground"
                onClick={() => onMaterialize(line, day.date)}
              >
                <FilePlus2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                {intl.get('payment_calendar.materialize')}
              </Button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
