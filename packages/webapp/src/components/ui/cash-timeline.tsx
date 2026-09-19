import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { Money } from '@/components/ui/money';
import {
  TimelinePoint,
  buildTimelineScale,
} from '@/components/ui/cash-timeline-scale';

export interface CashTimelineProps {
  /** Остаток сегодня — уже отформатированный сервером. */
  balanceFormatted: string;
  /** Прогноз остатка по дням вперёд. Пустой — ленты не будет. */
  points: TimelinePoint[];
  /** День, с которого сервер считает кассовый разрыв. */
  gapDate?: string | null;
  /** Подпись про разрыв: «денег не хватит 14 октября». */
  gapNote?: React.ReactNode;
  /** Что показать вместо ленты, когда прогноза нет. */
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Лента денег — герой главной страницы.
 *
 * Почему лента, а не крупное число. Крупное число отвечает только на вопрос
 * «сколько сейчас». Владельцу нужнее «доживу ли до конца месяца»: лента
 * показывает УСТРОЙСТВО — как деньги движутся, — а не один срез. И это ровно
 * то, чем продукт отличается от таблицы в электронных таблицах.
 *
 * Оформление: это полоса во всю ширину, а не карточка. Отдельная карточка
 * уравняла бы героя со всеми прочими блоками страницы.
 */
export const CashTimeline = ({
  balanceFormatted,
  points,
  gapDate,
  gapNote,
  fallback,
  className,
}: CashTimelineProps) => {
  const { bars, zeroLine, hasGap } = buildTimelineScale(points, gapDate);

  return (
    <section
      className={cn('border-b border-border pb-6', className)}
      aria-labelledby="cash-timeline-title"
    >
      <p
        id="cash-timeline-title"
        className="text-[0.8125rem] text-text-secondary"
      >
        {intl.get('cash_timeline.title')}
      </p>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        {/* Остаток СЕГОДНЯ красным не красится, даже когда впереди разрыв.
            410 500 ₽ на счёте — не авария, а факт; аварию описывает подпись
            рядом и красные столбики впереди. Покрасишь и число — человек
            перестанет верить красному вообще. */}
        <Money hero align="left">{balanceFormatted}</Money>
        {gapNote && (
          <span className="text-sm text-danger">{gapNote}</span>
        )}
      </div>

      {bars.length > 0 ? (
        <div
          className="mt-5"
          role="img"
          aria-label={
            hasGap
              ? intl.get('cash_timeline.aria_gap', { days: bars.length })
              : intl.get('cash_timeline.aria_ok', { days: bars.length })
          }
        >
          <div className="relative flex h-24 items-stretch gap-[2px]">
            {/* Нулевая линия — единственная горизонталь на ленте. Она и есть
                ответ на вопрос «близко ли к нулю». */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 h-px bg-border"
              style={{ top: `${zeroLine * 100}%` }}
            />
            {bars.map((bar) => (
              <div
                key={bar.date}
                className="group relative flex min-w-[3px] flex-1 flex-col"
                title={`${bar.date}`}
              >
                {/* Часть выше нуля */}
                <div
                  className="flex flex-col justify-end"
                  style={{ height: `${zeroLine * 100}%` }}
                >
                  <span
                    className={cn(
                      // Обычные дни залиты ТИХО, проблемные — в полную силу.
                      // Сплошная заливка на всех днях превращала ленту
                      // благополучной компании в чёрную стену: правда, но
                      // тяжело смотреть, и красному уже нечем выделиться.
                      'w-full rounded-t-[2px] transition-colors',
                      bar.isGap ? 'bg-danger' : 'bg-text-primary/25',
                      'group-hover:bg-accent',
                    )}
                    style={{
                      height: `${(bar.up / (zeroLine || 1)) * 100}%`,
                    }}
                  />
                </div>
                {/* Часть ниже нуля */}
                <div
                  className="flex flex-col justify-start"
                  style={{ height: `${(1 - zeroLine) * 100}%` }}
                >
                  <span
                    className="w-full rounded-b-[2px] bg-danger"
                    style={{
                      height: `${(bar.down / (1 - zeroLine || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-between text-xs text-text-muted">
            <span>{intl.get('cash_timeline.today')}</span>
            <span>
              {intl.get('cash_timeline.in_days', { days: bars.length })}
            </span>
          </div>
        </div>
      ) : (
        fallback
      )}
    </section>
  );
};
