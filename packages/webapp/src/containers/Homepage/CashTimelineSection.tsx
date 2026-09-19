import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import moment from 'moment';

import { CashTimeline } from '@/components/ui/cash-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { Features } from '@/constants/features';
import { useFeatureCan } from '@/hooks/state';
import { usePaymentCalendar } from '@/hooks/query/paymentCalendar';

import { useMoneySummary } from './useMoneySummary';

/** Насколько вперёд смотрит лента. Месяц — горизонт, которым живёт владелец. */
const HORIZON_DAYS = 30;

/** «2026-10-14» → «14 октября» на языке интерфейса. */
const formatDay = (isoDate: string): string => {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) return isoDate;

  return new Intl.DateTimeFormat(
    intl.getInitOptions?.()?.currentLocale || 'ru',
    { day: 'numeric', month: 'long' },
  ).format(parsed);
};

/**
 * Герой главной — лента денег.
 *
 * Стоит первым блоком: человек заходит утром в продукт учёта денег и должен
 * увидеть деньги, а не оглавление.
 *
 * Лента ЧЕСТНО вырождается. Платёжный календарь — отключаемый модуль, и когда
 * он выключен, прогноза нет. Тогда показывается остаток и прямо говорится,
 * чего не хватает и где это включить. Пустая полоса на её месте выглядела бы
 * поломкой, а «прогноз ровный» было бы прямой неправдой.
 */
export default function CashTimelineSection() {
  const { featureCan } = useFeatureCan();
  const calendarOn = featureCan(Features.PaymentCalendar);

  const { data: summary, isLoading: summaryLoading } = useMoneySummary();

  const range = React.useMemo(
    () => ({
      fromDate: moment().format('YYYY-MM-DD'),
      toDate: moment().add(HORIZON_DAYS, 'days').format('YYYY-MM-DD'),
    }),
    [],
  );

  const { data: forecast, isLoading: forecastLoading } = usePaymentCalendar(
    range,
    { enabled: calendarOn },
  );

  if (summaryLoading || (calendarOn && forecastLoading)) {
    return (
      <section className="border-b border-border pb-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-10 w-56" />
        <Skeleton className="mt-5 h-24 w-full" />
      </section>
    );
  }

  // Нет даже остатка — блок не показываем вовсе: прочерк на месте главного
  // числа тревожит сильнее, чем его отсутствие.
  if (!summary?.cashBalance) return null;

  const points =
    (forecast?.days ?? []).map((day: any) => ({
      date: day.date,
      balance: Number(day.balance),
    })) ?? [];

  const gap = forecast?.gap ?? null;

  return (
    <CashTimeline
      balanceFormatted={summary.cashBalance.formattedAmount}
      points={points}
      gapDate={gap?.date ?? null}
      gapNote={
        gap ? intl.get('cash_timeline.gap_note', { date: formatDay(gap.date) }) : null
      }
      fallback={
        <p className="mt-4 max-w-[60ch] text-sm text-text-secondary">
          {calendarOn
            ? intl.get('cash_timeline.empty_forecast')
            : intl.get('cash_timeline.no_forecast')}{' '}
          {!calendarOn && (
            <Link
              to="/preferences/modules"
              className="font-medium text-text-primary underline underline-offset-2"
            >
              {intl.get('cash_timeline.no_forecast_action')}
            </Link>
          )}
        </p>
      }
    />
  );
}
