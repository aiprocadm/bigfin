// © 2026 Bigfin
import type { DrillDownTarget } from '@/containers/FinancialStatements/ReportDrillDownPanel';
import type {
  AiCfoAction,
  AiCfoFigure,
  AiCfoMemo,
  AiCfoReply,
} from '@/hooks/query/aiCfo';

/**
 * Чистые помощники экрана AI CFO (FT-100…FT-102 ТЗ-3).
 *
 * Вынесены из компонентов, чтобы их можно было проверить без браузера и без
 * хранилища: здесь нет ни запросов, ни форматтеров организации — их
 * передают снаружи.
 */

/**
 * «Показать операции» по числу ответа → цель панели раскрытия.
 *
 * Сервер описывает раскрытие теми же полями, что и ячейка отчёта, — здесь
 * они только переносятся. Своих фильтров витрина НЕ добавляет: итог панели
 * обязан совпасть с числом ответа (AC 2), а лишний фильтр его бы изменил.
 *
 * `null` — раскрывать нечего: без статьи, счёта или яруса панель не знает,
 * какие операции показать, и кнопку рисовать нельзя.
 */
export function drillTargetFromFigure(
  figure: Pick<AiCfoFigure, 'drill' | 'label'> | null | undefined,
): DrillDownTarget | null {
  const drill = figure?.drill;
  if (!drill || !drill.fromDate || !drill.toDate) return null;
  if (!drill.articleId && !drill.accountId && !drill.plType) return null;

  return {
    ...(drill.articleId ? { articleId: Number(drill.articleId) } : {}),
    ...(drill.accountId ? { accountId: Number(drill.accountId) } : {}),
    ...(drill.plType ? { plType: drill.plType } : {}),
    ...(drill.basis ? { basis: drill.basis } : {}),
    fromDate: drill.fromDate,
    toDate: drill.toDate,
    // Заголовок панели — как у числа в ответе, чтобы человек видел, что
    // раскрыл именно его.
    title: drill.title ?? figure?.label,
  };
}

/** Число ответа, на которое ссылается причина. */
export function figureByKey(
  reply: Pick<AiCfoReply, 'figures'>,
  key: string | undefined,
): AiCfoFigure | undefined {
  if (!key) return undefined;
  return (reply.figures ?? []).find((figure) => figure.key === key);
}

export interface FigureFormatters {
  money: (value: number) => string;
  percent: (value: number) => string;
  date: (iso: string) => string;
  /** Что писать, когда числа нет: «нет базы», а не «0» и не «+100 %». */
  none: string;
}

/**
 * Значение числа ответа по его виду.
 *
 * Пустое значение — не ноль. Для роста без базы сравнения сервер отдаёт
 * `null` (правило 6 ТЗ): показать «0 %» или «+100 %» значило бы соврать.
 */
export function formatFigureValue(
  figure: Pick<AiCfoFigure, 'kind' | 'value' | 'date'>,
  fmt: FigureFormatters,
): string {
  if (figure.kind === 'date') {
    const iso = figure.date ?? (figure.value !== null ? String(figure.value) : '');
    return iso ? fmt.date(iso) : fmt.none;
  }
  if (figure.value === null || figure.value === undefined) return fmt.none;

  const value = Number(figure.value);
  if (!Number.isFinite(value)) return fmt.none;

  switch (figure.kind) {
    case 'money':
      return fmt.money(value);
    case 'percent':
      return fmt.percent(value);
    default:
      return String(value);
  }
}

/** Ответ содержательный: есть что показать, кроме заголовка. */
export function isSubstantiveReply(reply: AiCfoReply): boolean {
  return reply.available && reply.understood && !reply.empty;
}

/** Модель назвала числа, которых нет в расчёте, — о подмене надо сказать. */
export function hasRejectedNumbers(reply: Pick<AiCfoReply, 'explanation'>): boolean {
  return (reply.explanation?.rejectedNumbers?.length ?? 0) > 0;
}

/**
 * Записка простым текстом для «Скопировать текст»: заголовок раздела и его
 * абзацы, между разделами — пустая строка.
 *
 * Числа отдельным списком не добавляются: они уже названы в абзацах, а
 * повтор без подписи валюты читался бы хуже самого текста.
 */
export function memoPlainText(memo: Pick<AiCfoMemo, 'sections'> | null | undefined): string {
  return (memo?.sections ?? [])
    .map((section) =>
      [section.title, ...(section.text ?? [])]
        .map((line) => String(line ?? '').trim())
        .filter(Boolean)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Подстановки для вопроса «Перенести платёж … с … на …?».
 *
 * Даты берутся из самого действия, а не из тела запроса: человек
 * подтверждает то, что видит в карточке.
 */
export function actionConfirmValues(
  action: Pick<AiCfoAction, 'amount' | 'fromDate' | 'toDate'>,
  fmt: Pick<FigureFormatters, 'money' | 'date'>,
): { amount: string; from: string; to: string } {
  return {
    amount: fmt.money(Number(action.amount) || 0),
    from: fmt.date(action.fromDate),
    to: fmt.date(action.toDate),
  };
}

/** Новая дата плана для «Перенести» — из тела, которое описал сервер. */
export function actionPlannedDate(action: Pick<AiCfoAction, 'execute' | 'toDate'>): string {
  return String(action.execute?.body?.plannedDate ?? action.toDate);
}

/**
 * Разрыв из ответа «что если»: `{ date, amount }` первой ямы или `null`,
 * когда остаток нигде не уходит в минус.
 */
export function gapFromWhatIf(
  response: any,
): { date: string; amount: number } | null {
  const gap = response?.gap;
  if (!gap || !gap.date) return null;
  return { date: String(gap.date), amount: Math.abs(Number(gap.amount) || 0) };
}

/**
 * Ячейка таблицы ответа. Сервер отдаёт числа сырыми: в столбце со знаком
 * процента — процент, в остальных — деньги (все таблицы AI CFO денежные:
 * было / стало / изменение / долг). Пустая ячейка — «нет базы», не ноль.
 */
export function tableCellText(
  column: string | undefined,
  cell: string | number | null,
  fmt: FigureFormatters,
): string {
  if (cell === null || cell === undefined) return fmt.none;
  if (typeof cell !== 'number') return String(cell);
  return /%/.test(column ?? '') ? fmt.percent(cell) : fmt.money(cell);
}
