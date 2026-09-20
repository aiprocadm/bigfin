/**
 * Правила построения «ленты денег» (герой главной).
 *
 * Лента отвечает на вопрос, который владелец задаёт каждое утро: «доживу ли я
 * до конца месяца». Не «сколько у меня сейчас» — это одно число, и его видно
 * рядом, — а именно движение: где деньги просядут и не уйдут ли в минус.
 */

export interface TimelinePoint {
  date: string;
  balance: number;
}

export interface TimelineGeometry {
  /** Точки пути в долях от 0 до 1: x слева направо, y сверху вниз. */
  path: Array<{ date: string; x: number; y: number; balance: number }>;
  /** Где проходит нулевая линия, 0..1 сверху. `null` — ноль вне шкалы. */
  zeroLine: number | null;
  /** Остаток в начале и в конце — их подписывают числами. */
  first: number;
  last: number;
  /** Верх и низ шкалы — нужны для подписи, если решим её показать. */
  top: number;
  bottom: number;
  /** Ушёл ли остаток в минус хоть однажды. */
  hasGap: boolean;
  /** Меняется ли остаток вообще: ровный прогноз рисуется прямой. */
  isFlat: boolean;
}

/** Поле сверху и снизу, чтобы линия не липла к краям. */
const PADDING = 0.12;

/**
 * Считает геометрию линии остатка.
 *
 * ПОЧЕМУ ЛИНИЯ, А НЕ СТОЛБИКИ. Правило выбора фигуры: величину меряют
 * столбиком, изменение во времени — линией. Столбик меряется ДЛИНОЙ от нуля,
 * поэтому нулю обязательно быть в шкале. При остатке в 1,7 млн разница в 6 %
 * даёт 6 точек высоты — движение исчезает совсем.
 *
 * Найдено живым проходом: на стенде остаток за месяц падает на 101 250 ₽, а
 * лента рисовала ровную серую стену. Прежнее правило «ноль всегда в шкале»
 * было написано ДЛЯ СТОЛБИКОВ и вместе с ними уходит.
 *
 * ЧЕМ ЗАМЕНЕНО, ЧТОБЫ НЕ СОВРАТЬ. Линия кодирует положение, а не длину, и её
 * можно честно строить по размаху данных — при двух условиях, которые здесь и
 * выполняются:
 *
 * 1. Ноль ВХОДИТ в шкалу, как только прогноз уходит в минус. Тогда красная
 *    зона ниже нуля и есть ответ.
 * 2. Начало и конец пути ПОДПИСАНЫ числами. Иначе падение на 6 % и падение на
 *    99 % выглядели бы одинаково — оба «линия вниз».
 */
export function buildTimelineGeometry(
  points: TimelinePoint[],
): TimelineGeometry {
  const safe = (points ?? []).filter(
    (p) => p && typeof p.date === 'string' && Number.isFinite(Number(p.balance)),
  );

  if (safe.length === 0) {
    return {
      path: [],
      zeroLine: null,
      first: 0,
      last: 0,
      top: 0,
      bottom: 0,
      hasGap: false,
      isFlat: true,
    };
  }

  const balances = safe.map((p) => Number(p.balance));
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const hasGap = minBalance < 0;

  // Ноль обязателен в шкале, как только прогноз уходит в минус.
  const rawTop = hasGap ? Math.max(0, maxBalance) : maxBalance;
  const rawBottom = hasGap ? minBalance : minBalance;
  const rawSpan = rawTop - rawBottom;

  // Ровный прогноз — это ОТВЕТ, а не отсутствие ответа: остаток не меняется.
  // Рисуем прямую по середине, а не делим на ноль.
  const isFlat = rawSpan === 0;

  const pad = isFlat ? 1 : rawSpan * PADDING;
  const top = rawTop + pad;
  const bottom = rawBottom - pad;
  const span = top - bottom;

  const path = safe.map((p, index) => {
    const balance = Number(p.balance);

    return {
      date: p.date,
      balance,
      x: safe.length === 1 ? 0 : index / (safe.length - 1),
      y: (top - balance) / span,
    };
  });

  return {
    path,
    // Ноль показываем только когда он и правда в шкале: линия нуля посреди
    // благополучного прогноза — это лишняя горизонталь, которая ничего не
    // говорит.
    zeroLine: top >= 0 && bottom <= 0 ? (top - 0) / span : null,
    first: balances[0],
    last: balances[balances.length - 1],
    top,
    bottom,
    hasGap,
    isFlat,
  };
}
