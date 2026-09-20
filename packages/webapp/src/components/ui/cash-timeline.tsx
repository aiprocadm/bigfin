import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { Money } from '@/components/ui/money';
import {
  TimelinePoint,
  buildTimelineGeometry,
} from '@/components/ui/cash-timeline-scale';

export interface CashTimelineProps {
  /** Остаток сегодня — уже отформатированный сервером. */
  balanceFormatted: string;
  /** Прогноз остатка по дням вперёд. Пустой — ленты не будет. */
  points: TimelinePoint[];
  /**
   * ВЕРДИКТ СЛОВАМИ — то, зачем человек сюда смотрит.
   *
   * «Хватит до 20 октября» или «14 октября не хватит 120 000 ₽». График
   * показывает ПУТЬ, а ответ даёт фраза: путь читают глазами и с ошибкой,
   * фразу — читают.
   */
  verdict?: React.ReactNode;
  /** Вердикт про беду красится тревожным цветом. */
  verdictIsProblem?: boolean;
  /** Остаток в конце горизонта — подписывается у конца линии. */
  lastFormatted?: string | null;
  /** Подпись последнего дня горизонта: «20 октября». */
  lastDayLabel?: string | null;
  /** Что показать вместо ленты, когда прогноза нет. */
  fallback?: React.ReactNode;
  /** Как назвать сумму в подсказке при наведении. */
  formatHoverAmount?: (balance: number) => string;
  /** Как назвать день в подсказке при наведении. */
  formatHoverDay?: (date: string) => string;
  className?: string;
}

/** Высота поля графика в точках вьюбокса. Ширина всегда 100. */
const VIEW_H = 36;

/**
 * Лента денег — герой главной страницы.
 *
 * Почему лента, а не крупное число. Крупное число отвечает только на вопрос
 * «сколько сейчас». Владельцу нужнее «доживу ли до конца месяца»: лента
 * показывает УСТРОЙСТВО — как деньги движутся, — а не один срез.
 *
 * Оформление: полоса во всю ширину, а не карточка. Отдельная карточка
 * уравняла бы героя со всеми прочими блоками страницы.
 *
 * Жёлтый — фирменный цвет — стоит РОВНО В ОДНОМ месте всего экрана: точка
 * «сегодня». Это и есть тот единственный смысловой момент, который ему
 * положено метить.
 */
export const CashTimeline = ({
  balanceFormatted,
  points,
  verdict,
  verdictIsProblem = false,
  lastFormatted,
  lastDayLabel,
  fallback,
  formatHoverAmount,
  formatHoverDay,
  className,
}: CashTimelineProps) => {
  const geometry = React.useMemo(() => buildTimelineGeometry(points), [points]);
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const { path, zeroLine, hasGap, isFlat } = geometry;

  const line = path
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x * 100} ${p.y * VIEW_H}`)
    .join(' ');

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || path.length === 0) return;

    const share = (event.clientX - box.left) / box.width;
    const index = Math.round(share * (path.length - 1));

    setHoverIndex(Math.min(path.length - 1, Math.max(0, index)));
  };

  const hovered = hoverIndex === null ? null : path[hoverIndex];

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
            410 500 ₽ на счёте — не авария, а факт; аварию описывает вердикт
            рядом. Покрасишь и число — человек перестанет верить красному. */}
        <Money hero align="left">{balanceFormatted}</Money>
        {verdict && (
          <span
            className={cn(
              'text-[0.9375rem]',
              verdictIsProblem ? 'text-danger' : 'text-text-secondary',
            )}
          >
            {verdict}
          </span>
        )}
      </div>

      {path.length > 1 ? (
        <div className="mt-5">
          {/* Отступы по краям: без них точка «сегодня» срезается краем
              наполовину, а конец линии упирается в подпись под ним. */}
          <div
            className="relative px-1.5"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            <svg
              viewBox={`0 0 100 ${VIEW_H}`}
              preserveAspectRatio="none"
              className="h-24 w-full overflow-visible"
              role="img"
              aria-label={
                hasGap
                  ? intl.get('cash_timeline.aria_gap', { days: path.length })
                  : intl.get('cash_timeline.aria_ok', { days: path.length })
              }
            >
              {/* Зона ниже нуля. Появляется, ТОЛЬКО когда прогноз в неё
                  заходит: нулевая линия посреди благополучного прогноза —
                  лишняя горизонталь, которая ничего не говорит. */}
              {zeroLine !== null && (
                <>
                  <rect
                    x="0"
                    y={zeroLine * VIEW_H}
                    width="100"
                    height={Math.max(0, VIEW_H - zeroLine * VIEW_H)}
                    className="fill-danger/8"
                  />
                  <line
                    x1="0"
                    x2="100"
                    y1={zeroLine * VIEW_H}
                    y2={zeroLine * VIEW_H}
                    className="stroke-danger/40"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}

              {/* Путь остатка. Тонкая линия: она показывает форму, а не
                  заливает собой поле.

                  ЛИНИЯ НЕ КРАСНЕЕТ ЦЕЛИКОМ, даже когда впереди разрыв. При
                  разрыве 5 октября пятнадцать предыдущих дней — нормальные
                  дни, и красить их значит объявить проблемой всё подряд.
                  Правило продукта: красный — только у беды. Беду показывают
                  зона ниже нуля и вердикт словами. */}
              <path
                d={line}
                fill="none"
                className="stroke-text-primary/70"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />

              {hovered && (
                <line
                  x1={hovered.x * 100}
                  x2={hovered.x * 100}
                  y1="0"
                  y2={VIEW_H}
                  className="stroke-border"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )}
            </svg>

            {/* Точка «сегодня» — единственное жёлтое место на экране.
                Рисуется разметкой, а не в SVG: круг внутри растянутого
                вьюбокса стал бы овалом. */}
            <span
              aria-hidden
              className="pointer-events-none absolute flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent/25"
              style={{
                left: '0.375rem',
                top: `${path[0].y * 100}%`,
              }}
            >
              <span className="h-2 w-2 rounded-full bg-accent ring-2 ring-surface" />
            </span>

            {hovered && (
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-control border border-border bg-surface px-2 py-1 text-xs text-text-primary shadow-sm"
                style={{
                  left: `${Math.min(88, Math.max(12, hovered.x * 100))}%`,
                  top: `${hovered.y * 100}%`,
                }}
              >
                {/* ДВЕ СТРОКИ, А НЕ СРЕДНЯЯ ТОЧКА. «8 октября · 1 698 588 ₽»
                    — приём из чужих шаблонов: точка ничего не значит и
                    читается как пауза посреди фразы. День — подпись, сумма —
                    ответ; они и стоят друг под другом. */}
                <span className="block text-text-secondary">
                  {formatHoverDay ? formatHoverDay(hovered.date) : hovered.date}
                </span>
                <span className="block tabular-nums">
                  {formatHoverAmount
                    ? formatHoverAmount(hovered.balance)
                    : hovered.balance}
                </span>
              </span>
            )}
          </div>

          <div className="mt-2 flex items-baseline justify-between gap-4 text-xs text-text-muted">
            <span>{intl.get('cash_timeline.today')}</span>

            {/* КОНЕЦ ПУТИ ПОДПИСАН ЧИСЛОМ. Без него падение на 6 % и падение
                на 99 % выглядят одинаково — оба «линия вниз». */}
            <span className="text-right">
              {lastDayLabel}
              {lastFormatted && (
                <span className="ml-2 tabular-nums text-text-secondary">
                  {lastFormatted}
                </span>
              )}
            </span>
          </div>

          {isFlat && (
            <p className="mt-2 text-xs text-text-muted">
              {intl.get('cash_timeline.flat_note')}
            </p>
          )}
        </div>
      ) : (
        fallback
      )}
    </section>
  );
};
