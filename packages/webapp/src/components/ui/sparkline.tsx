import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

/**
 * «Тренд» — поведение строки отчёта одной линией (FIN-016 ТЗ-2).
 *
 * ЗАЧЕМ. Чтобы понять, растёт статья или падает, человек пробегает глазами
 * двенадцать колонок чисел. Линия отвечает на тот же вопрос за полсекунды.
 *
 * ПОЧЕМУ БЕЗ БИБЛИОТЕКИ ГРАФИКОВ. В отчёте до 300 строк, и в каждой своя
 * линия. Библиотека строит на строку по дереву узлов со своими наблюдателями
 * размера — отчёт перестал бы открываться. Здесь — один `<path>` на строку.
 *
 * ПОЧЕМУ ЛИНИЯ, А НЕ СТОЛБИКИ. Правило выбора фигуры то же, что у ленты денег
 * на главной: величину меряют столбиком, изменение во времени — линией.
 */

/** Точка тренда: подпись периода и его значение. */
export interface SparklinePoint {
  /** Подпись периода — её называет подсказка: «май», «июнь», «2025». */
  label: string;
  /**
   * Значение периода. `null` — периода в данных НЕТ. Это не ноль: ноль
   * означает «оборота не было», а `null` — «мы не знаем». Рисуются они
   * по-разному: ноль точкой на своём месте, пропуск — разрывом линии.
   */
  value: number | null;
}

/** Одна точка пути в долях от 0 до 1: x слева направо, y сверху вниз. */
export interface SparklineVertex {
  x: number;
  y: number;
  /** Номер точки в исходном списке — по нему находится подпись периода. */
  index: number;
}

/** Крайнее значение тренда — его называет подсказка. */
export interface SparklineExtreme {
  label: string;
  value: number;
  index: number;
}

export interface SparklineGeometry {
  /**
   * Отрезки линии. Пропуск РАЗРЫВАЕТ линию, а не соединяется через него:
   * соединив, мы нарисовали бы движение, которого не было в данных.
   */
  segments: SparklineVertex[][];
  min: SparklineExtreme;
  max: SparklineExtreme;
  /** Все значения равны: линия идёт ровно посередине, а не делится на ноль. */
  isFlat: boolean;
}

/** Поле сверху и снизу, чтобы линия не липла к краям. */
const PADDING = 0.15;

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * Координата пути с двумя знаками после запятой.
 *
 * Именно округлением, а НЕ `toFixed`: в продукте стоит сторож на `toFixed` с
 * дробной частью. Он поставлен по делу — `toFixed` всегда даёт точку, и в
 * русском тексте «1.75» рядом с «1 000,50 ₽» выглядит поломкой. Координате
 * SVG точка нужна, но заводить ради неё исключение в стороже нельзя:
 * исключение однажды применят к настоящему числу на экране.
 */
const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Считает геометрию тренда.
 *
 * Возвращает `null`, когда рисовать нечего: строка с одним значением тренда
 * не получает (правило FIN-016). Одна точка — это не изменение во времени, а
 * линия из одной точки выглядела бы как ровный тренд, то есть соврала бы.
 *
 * @param {SparklinePoint[]} points значения периодов слева направо
 * @returns {SparklineGeometry | null}
 */
export function buildSparklineGeometry(
  points: SparklinePoint[],
): SparklineGeometry | null {
  const all = points ?? [];
  const known = all
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => point && isNumber(point.value));

  if (known.length < 2) return null;

  const values = known.map(({ point }) => point.value as number);
  const lowest = Math.min(...values);
  const highest = Math.max(...values);
  const isFlat = lowest === highest;

  // Ровный тренд — это ОТВЕТ («ничего не менялось»), а не отсутствие ответа.
  const pad = isFlat ? 1 : (highest - lowest) * PADDING;
  const top = highest + pad;
  const bottom = lowest - pad;
  const span = top - bottom;

  const lastIndex = all.length - 1;
  const segments: SparklineVertex[][] = [];
  let segment: SparklineVertex[] = [];

  all.forEach((point, index) => {
    if (!point || !isNumber(point.value)) {
      // Пропуск закрывает текущий отрезок: линия прервётся.
      if (segment.length > 0) segments.push(segment);
      segment = [];
      return;
    }

    segment.push({
      index,
      x: lastIndex === 0 ? 0 : index / lastIndex,
      y: (top - point.value) / span,
    });
  });

  if (segment.length > 0) segments.push(segment);

  // Из одинаковых крайних берётся ПЕРВЫЙ: подсказка называет тот период,
  // когда значение впервые стало таким.
  const lowestAt = known.find(({ point }) => point.value === lowest)!;
  const highestAt = known.find(({ point }) => point.value === highest)!;

  return {
    segments,
    isFlat,
    min: {
      label: all[lowestAt.index].label,
      value: lowest,
      index: lowestAt.index,
    },
    max: {
      label: all[highestAt.index].label,
      value: highest,
      index: highestAt.index,
    },
  };
}

const VIEW_W = 88;
const VIEW_H = 20;

export interface SparklineProps {
  points: SparklinePoint[];
  /** Как показать сумму в подсказке. По умолчанию — как есть. */
  formatValue?: (value: number) => string;
  /** Ширина и высота в точках экрана. Умолчание — 88×20 (§10.2 ТЗ-2). */
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Линия тренда с подсказкой о минимуме и максимуме.
 *
 * Подсказка обязательна: линия без чисел показывает форму, но не величину, а
 * падение на 6 % и падение на 99 % рисуются одинаково — «линия вниз».
 */
export function Sparkline({
  points,
  formatValue = (value) => String(value),
  width = VIEW_W,
  height = VIEW_H,
  className,
}: SparklineProps) {
  const geometry = React.useMemo(
    () => buildSparklineGeometry(points),
    [points],
  );

  // Рисовать нечего — не рисуем ничего. Пустая рамка на месте тренда
  // читалась бы как «тренд ровный», то есть как утверждение.
  if (geometry === null) return null;

  const { segments, min, max } = geometry;

  const paths = segments
    .filter((segment) => segment.length > 0)
    .map((segment) =>
      segment
        .map(
          (vertex, position) =>
            `${position === 0 ? 'M' : 'L'} ${round2(vertex.x * VIEW_W)} ${round2(
              vertex.y * VIEW_H,
            )}`,
        )
        .join(' '),
    );

  const hint = intl.get('sparkline.min_max', {
    minLabel: min.label,
    minValue: formatValue(min.value),
    maxLabel: max.label,
    maxValue: formatValue(max.value),
  });

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn('inline-flex items-center', className)}
            // Линия — не единственный носитель смысла: та же величина
            // доступна словами и читалке экрана, и наведению.
            aria-label={hint}
          >
            <svg
              width={width}
              height={height}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              role="img"
              focusable="false"
            >
              {paths.map((d) => (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  className="stroke-action"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </span>
        </TooltipTrigger>
        <TooltipContent>{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
