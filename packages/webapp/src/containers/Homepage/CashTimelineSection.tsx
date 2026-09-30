import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';
import moment from 'moment';

import { CashTimeline } from '@/components/ui/cash-timeline';
import { Skeleton } from '@/components/ui/skeleton';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Features } from '@/constants/features';
import { useFeatureCan } from '@/hooks/state';
import { useCanViewMoney } from '@/hooks/utils/useAbilityContext';
import { usePaymentCalendar } from '@/hooks/query/paymentCalendar';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { formatDayMonth } from '@/utils/formatDayMonth';

import { useMoneySummary } from './useMoneySummary';

/**
 * Насколько вперёд смотрит лента. Месяц — горизонт, которым живёт владелец;
 * квартал — чтобы увидеть разрыв заранее (C1, этап 47 ТЗ-4). Выбор
 * запоминается.
 */
const HORIZONS = ['30', '90'] as const;
type Horizon = (typeof HORIZONS)[number];
const HORIZON_KEY = 'bigfin.cash_timeline.horizon';

const readHorizon = (): Horizon => {
  try {
    return window.localStorage.getItem(HORIZON_KEY) === '90' ? '90' : '30';
  } catch {
    return '30';
  }
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
  // Календарь платежей на сервере закрыт тем же правом, что и сводка денег
  // (FT-084): без него не спрашиваем, иначе 403 закроет весь экран.
  const canViewMoney = useCanViewMoney();
  const calendarOn = featureCan(Features.PaymentCalendar) && canViewMoney;

  const { data: summary, isLoading: summaryLoading } = useMoneySummary();

  const [horizon, setHorizonState] = React.useState<Horizon>(readHorizon);
  const setHorizon = (next: Horizon) => {
    setHorizonState(next);
    try {
      window.localStorage.setItem(HORIZON_KEY, next);
    } catch {
      // Хранилище недоступно — выбор живёт до ухода со страницы.
    }
  };

  const range = React.useMemo(
    () => ({
      fromDate: moment().format('YYYY-MM-DD'),
      toDate: moment().add(Number(horizon), 'days').format('YYYY-MM-DD'),
    }),
    [horizon],
  );

  const { data: forecast, isLoading: forecastLoading } = usePaymentCalendar(
    range,
    { enabled: calendarOn, keepPreviousData: true },
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
  const lastDay = points.length > 0 ? points[points.length - 1] : null;

  /**
   * ВЕРДИКТ СЛОВАМИ — то, ради чего человек открывает главную.
   *
   * Продукт ЗНАЛ ответ и молчал: сервер считает разрыв, а на экране об этом
   * не было ни слова. График показывает путь, но путь читают глазами и с
   * ошибкой; фразу читают.
   */
  const verdict = gap
    ? intl.get('cash_timeline.verdict_gap', {
        date: formatDayMonth(gap.date),
        amount: formatOrganizationMoney(Math.abs(Number(gap.amount ?? 0))),
      })
    : lastDay
      ? intl.get('cash_timeline.verdict_ok', { date: formatDayMonth(lastDay.date) })
      : null;

  return (
    <CashTimeline
      balanceFormatted={summary.cashBalance.formattedAmount}
      points={points}
      verdict={verdict}
      verdictIsProblem={Boolean(gap)}
      lastFormatted={
        lastDay ? formatOrganizationMoney(lastDay.balance) : null
      }
      lastDayLabel={lastDay ? formatDayMonth(lastDay.date) : null}
      formatHoverDay={formatDayMonth}
      formatHoverAmount={formatOrganizationMoney}
      actions={
        calendarOn ? (
          <SegmentedControl
            size="sm"
            aria-label={intl.get('cash_timeline.horizon.aria')}
            value={horizon}
            onChange={setHorizon}
            options={HORIZONS.map((days) => ({
              value: days,
              label: intl.get('cash_timeline.horizon.days', { days }),
            }))}
          />
        ) : null
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
