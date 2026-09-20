import React from 'react';
import intl from 'react-intl-universal';
import { ChevronDown, ChevronRight } from 'lucide-react';

import { formatOrganizationMoney } from '@/utils/organizationMoney';

import { DayRow } from './DayRow';
import { formatDay } from './formatDay';
import { ForecastDay, ForecastLine, ForecastPeriod } from './mapForecast';

export interface PeriodRowProps {
  period: ForecastPeriod;
  /** Дни, попавшие в этот период: из них и складывается клетка. */
  days: ForecastDay[];
  onMaterialize?: (line: ForecastLine, date: string) => void;
}

/**
 * Клетка календаря крупнее дня — с раскрытием до операций (FIN-019, FIN-020).
 *
 * НАЙДЕНО СВЕРКОЙ ЗАДЕЛА. Переключатель масштаба на экране был, сервер
 * честно считал периоды — а витрина рисовала дни и периоды не читала
 * вовсе. Человек менял масштаб, и НИЧЕГО не происходило: самый обидный вид
 * поломки, потому что и код есть, и кнопка есть.
 *
 * ФАКТ И ПЛАН РАЗДЕЛЕНЫ. Внутри одной клетки соседствуют прошедшая часть
 * периода и оставшаяся. Показать их одним числом значило бы выдать план за
 * свершившееся.
 *
 * РАСКРЫТИЕ ВМЕСТО ПАНЕЛИ. У конкурента клик по числу не делает ничего.
 * Здесь клетка разворачивается прямо на месте — в те самые дни и строки, из
 * которых она сложилась, вместе с кнопкой «Записать в учёт». Отдельная
 * шторка добавила бы щелчок и ничего к ответу.
 *
 * ПУСТАЯ КЛЕТКА НЕ РАСКРЫВАЕТСЯ: разворачивать нечего, и предлагать это
 * значит обещать то, чего нет.
 */
export function PeriodRow({ period, days, onMaterialize }: PeriodRowProps) {
  const [open, setOpen] = React.useState(false);

  const hasMovement = period.inflow !== 0 || period.outflow !== 0;
  const negative = period.balance < 0;
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="border-b py-2">
      <button
        type="button"
        disabled={!hasMovement}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center justify-between gap-3 px-2 text-left ${
          hasMovement ? 'hover:bg-muted/40' : 'cursor-default'
        } ${negative ? 'font-semibold text-red-600' : ''}`}
      >
        <span className="flex items-center gap-1">
          {hasMovement && <Chevron className="h-4 w-4" aria-hidden="true" />}
          {formatDay(period.from)} — {formatDay(period.to)}
        </span>
        <span className="flex flex-col items-end text-sm">
          <span>
            {negative ? '🔴 ' : ''}
            {intl.get('payment_calendar.balance')}:{' '}
            {formatOrganizationMoney(period.balance)}
          </span>
          {/* Факт и план рядом: прошедшая часть периода уже случилась. */}
          <span className="text-xs text-text-secondary">
            {intl.get('payment_calendar.fact_plan', {
              fact: formatOrganizationMoney(
                period.factInflow - period.factOutflow,
              ),
              plan: formatOrganizationMoney(
                period.planInflow - period.planOutflow,
              ),
            })}
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-1 border-l pl-2">
          {days.length === 0 ? (
            <p className="px-2 py-1 text-sm text-text-secondary">
              {intl.get('payment_calendar.period_empty')}
            </p>
          ) : (
            days.map((day) => (
              <DayRow key={day.date} day={day} onMaterialize={onMaterialize} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Дни, попавшие в клетку.
 *
 * Сравнение строк дат работает, потому что формат `ГГГГ-ММ-ДД` сортируется
 * как текст в том же порядке, что и как дата. Разбирать дату ради этого
 * незачем.
 *
 * @param {ForecastDay[]} days все дни прогноза
 * @param {ForecastPeriod} period клетка
 * @returns {ForecastDay[]}
 */
export function daysOfPeriod(
  days: ForecastDay[],
  period: ForecastPeriod,
): ForecastDay[] {
  return (days ?? []).filter(
    (day) => day.date >= period.from && day.date <= period.to,
  );
}
