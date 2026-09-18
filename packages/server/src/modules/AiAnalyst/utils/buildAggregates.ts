// © 2026 Bigfin
import { AggregateRow } from './insightsPrompt';

/**
 * Превращение строк отчёта в агрегаты для модели (этап 13 ТЗ, §13.1 п. 2).
 *
 * Здесь происходит главное сужение: из строки отчёта берутся ТОЛЬКО название,
 * суммы и доля. Всё прочее — идентификаторы, ссылки на счета, любые поля,
 * которые появятся в отчёте завтра, — не переносится.
 *
 * Это не дублирование проверки приватности, а её опора: проверка ловит то,
 * что просочилось, а этот сбор с самого начала ничего лишнего не берёт.
 * Разрешительный сбор надёжнее запретительной фильтрации — забыть добавить
 * поле безопасно, забыть запретить нет.
 */

/** Строка отчёта, как её отдаёт свёртка статей. */
export interface ReportRow {
  name: string;
  kind?: string;
  amount: number;
  [key: string]: unknown;
}

export interface BuildAggregatesInput {
  current: ReportRow[];
  previous?: ReportRow[];
  reportKey: string;
  link: string;
  /** Сколько строк отдаём модели. */
  limit?: number;
}

/**
 * Сколько строк уходит в модель.
 *
 * Не все: справочник статей бывает на две сотни строк, и платить за них
 * незачем. Берём самые крупные по модулю — именно они двигают итог.
 */
const DEFAULT_LIMIT = 20;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Изменение в процентах.
 *
 * Возвращает `undefined`, когда прошлого значения не было или оно было нулём.
 * Ноль в знаменателе дал бы бесконечность, а «рост на 100%» с нуля — это не
 * рост, это появление: сказать про такое «выросло вдвое» было бы неправдой.
 */
export function changePercent(
  current: number,
  previous: number | undefined,
): number | undefined {
  if (previous === undefined || previous === 0) return undefined;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return undefined;

  return round2(((current - previous) / Math.abs(previous)) * 100);
}

/**
 * Собирает агрегаты.
 *
 * Доля считается от суммы ПОЛОЖИТЕЛЬНЫХ величин: доля от суммы со знаками
 * даёт бессмыслицу вроде «доля 340%», когда доходы и расходы гасят друг друга
 * в знаменателе.
 */
export function buildAggregates(input: BuildAggregatesInput): AggregateRow[] {
  const previousByName = new Map<string, number>();

  (input.previous ?? []).forEach((row) => {
    previousByName.set(row.name, Number(row.amount) || 0);
  });

  const rows = (input.current ?? [])
    .filter((row) => Number.isFinite(Number(row.amount)))
    .slice()
    .sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))
    .slice(0, input.limit ?? DEFAULT_LIMIT);

  const denominator = rows.reduce(
    (sum, row) => sum + Math.abs(Number(row.amount)),
    0,
  );

  return rows.map((row) => {
    const amount = round2(Number(row.amount));
    const previous = previousByName.get(row.name);

    const aggregate: AggregateRow = {
      label: row.name,
      amount,
      reportKey: input.reportKey,
      link: input.link,
    };

    if (previous !== undefined) {
      aggregate.previousAmount = round2(previous);

      const change = changePercent(amount, previous);

      if (change !== undefined) aggregate.changePercent = change;
    }
    if (denominator > 0) {
      aggregate.share = round2(Math.abs(amount) / denominator);
    }
    return aggregate;
  });
}
