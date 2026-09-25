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
  foundOperationId,
}: {
  day: ForecastDay;
  /** Записать плановую строку в учёт (О3): строка + дата вхождения. */
  onMaterialize?: (line: ForecastLine, date: string) => void;
  /**
   * Номер плановой операции, которую нашёл поиск в шапке (карта v48).
   * Календарь не открывает операцию отдельным экраном — он показывает её
   * среди соседних дней, поэтому найденную выделяем и подводим к ней.
   */
  foundOperationId?: number | null;
}) {
  const negative = day.balance < 0;
  const weekend = isWeekend(day.date);

  return (
    // Цвета — из токенов (этап 50 ТЗ-4): отрицательный остаток — цветом
    // проблемы, без значка-смайлика; выходные — приглушённым текстом.
    <div className="border-b border-border py-2">
      <div
        className={`flex items-center justify-between px-2 ${
          negative ? 'font-semibold text-danger' : ''
        }`}
      >
        <span className={weekend && !negative ? 'text-text-muted' : ''}>
          {formatDay(day.date)}
        </span>
        <span className="tabular-nums">
          {intl.get('payment_calendar.balance')}: {money(day.balance)}
        </span>
      </div>
      {(day.lines ?? []).map((line, i) => {
        const found =
          foundOperationId != null &&
          line.plannedOperationId === foundOperationId;

        return (
        <div
          key={i}
          ref={(node) => found && node?.scrollIntoView({ block: 'center' })}
          className={`flex items-center justify-between px-4 text-sm ${
            // Выплата — не авария: обычным текстом, приход — зелёным.
            line.direction === 'inflow' ? 'text-success' : 'text-text-primary'
          }${found ? ' ring-2 ring-action rounded-control' : ''}`}
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
        );
      })}
    </div>
  );
}
