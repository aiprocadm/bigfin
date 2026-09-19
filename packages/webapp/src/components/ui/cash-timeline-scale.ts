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

export interface TimelineBar extends TimelinePoint {
  /** Доля высоты полосы от нуля вверх, 0..1. Для минуса — 0. */
  up: number;
  /** Доля высоты полосы от нуля вниз, 0..1. Для плюса — 0. */
  down: number;
  /** День, когда денег не хватило. Красится красным. */
  isGap: boolean;
}

export interface TimelineScale {
  bars: TimelineBar[];
  /** Доля высоты, на которой проходит нулевая линия (сверху), 0..1. */
  zeroLine: number;
  /** Ушёл ли остаток в минус хоть однажды. */
  hasGap: boolean;
}

/**
 * Считает высоты столбиков.
 *
 * ГЛАВНОЕ РЕШЕНИЕ: НОЛЬ ВСЕГДА В ШКАЛЕ. Подгонять шкалу под «от минимума до
 * максимума» нельзя: тогда падение с миллиона до девятисот тысяч нарисуется
 * обрывом, а падение со ста тысяч до тысячи — пологим склоном. Владелец
 * спрашивает не «насколько изменилось», а «близко ли к нулю», и шкала обязана
 * отвечать на этот вопрос, а не льстить.
 *
 * Плата за честность: у компании с большим запасом лента будет ровной. Это
 * верно по сути — у неё и правда всё ровно.
 */
export function buildTimelineScale(
  points: TimelinePoint[],
  gapDate?: string | null,
): TimelineScale {
  const safe = (points ?? []).filter(
    (p) => p && typeof p.date === 'string' && Number.isFinite(Number(p.balance)),
  );

  if (safe.length === 0) {
    return { bars: [], zeroLine: 1, hasGap: false };
  }

  const balances = safe.map((p) => Number(p.balance));
  const top = Math.max(0, ...balances);
  const bottom = Math.min(0, ...balances);
  const span = top - bottom;

  // Всё по нулям — рисуем плоскую ленту по нулевой линии, а не делим на ноль.
  if (span === 0) {
    return {
      bars: safe.map((p) => ({ ...p, up: 0, down: 0, isGap: false })),
      zeroLine: 1,
      hasGap: false,
    };
  }

  const zeroLine = top / span;

  const bars = safe.map((p) => {
    const balance = Number(p.balance);
    const isGap = balance < 0;

    return {
      date: p.date,
      balance,
      up: balance > 0 ? balance / span : 0,
      down: balance < 0 ? Math.abs(balance) / span : 0,
      // Отмечаем КАЖДЫЙ день в минусе, а не только первый. Первый день разрыва
      // важен для предупреждения, но человеку надо видеть и то, сколько он
      // продлится: один день без денег и три недели без денег — разные беды.
      isGap: isGap || (!!gapDate && p.date === gapDate),
    };
  });

  return { bars, zeroLine, hasGap: bars.some((b) => b.isGap) };
}
