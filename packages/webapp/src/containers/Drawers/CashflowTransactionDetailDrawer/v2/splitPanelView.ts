// © 2026 Bigfin
/**
 * Правила панели разделения операции (этап 10 ТЗ).
 *
 * Одна платёжка на 100 000 ₽ = аренда 70 000 + коммунальные 30 000. Пока
 * операция целиком уходит в одну статью, отчёты врут.
 *
 * Те же правила проверяет сервер — и это НЕ дублирование ради дублирования:
 * здесь они нужны, чтобы человек видел остаток, пока печатает, а не узнавал
 * об ошибке после сохранения.
 */

export interface SplitLine {
  amount: number;
  articleId?: number | null;
}

export type SplitProblem =
  | 'empty'
  | 'not_distributed'
  | 'over_distributed'
  | 'non_positive_line'
  | 'article_missing'
  | null;

export interface SplitState {
  distributed: number;
  remaining: number;
  isValid: boolean;
  problem: SplitProblem;
}

/**
 * Копейки. Суммы — числа с плавающей точкой, и 0.1 + 0.2 даёт
 * 0.30000000000000004. Сравнивать такие суммы «в лоб» нельзя: кнопка
 * сохранения не нажмётся никогда, и человек не поймёт почему.
 */
const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Состояние разбиения.
 *
 * Порядок проверок — от «нечего сохранять» к «сходится ли». Сначала пустые и
 * неверные строки: сообщить «не хватает 30 000» человеку, который ещё не
 * выбрал статью, — значит подсказать не то.
 */
export function evaluateSplit(
  parentAmount: number,
  lines: SplitLine[],
): SplitState {
  const rows = lines ?? [];
  const distributed = round2(
    rows.reduce((sum, line) => sum + Number(line.amount ?? 0), 0),
  );
  const remaining = round2(Number(parentAmount ?? 0) - distributed);
  const base = { distributed, remaining };

  if (rows.length === 0) {
    return { ...base, isValid: false, problem: 'empty' };
  }

  // Часть на ноль или минус — это не часть. Ноль означает «я ещё не
  // дописал», и сохранять такое нельзя.
  if (rows.some((line) => !(Number(line.amount) > 0))) {
    return { ...base, isValid: false, problem: 'non_positive_line' };
  }

  // Часть без статьи бессмысленна: разделение делают ради того, чтобы
  // суммы попали в разные статьи.
  if (rows.some((line) => line.articleId == null)) {
    return { ...base, isValid: false, problem: 'article_missing' };
  }

  if (remaining > 0) {
    return { ...base, isValid: false, problem: 'not_distributed' };
  }
  if (remaining < 0) {
    return { ...base, isValid: false, problem: 'over_distributed' };
  }

  return { ...base, isValid: true, problem: null };
}

/**
 * Сумма для новой строки — весь нераспределённый остаток.
 *
 * Так разделение пополам делается двумя щелчками: добавил строку, вписал
 * половину, добавил вторую — остаток подставился сам. Отрицательный остаток
 * не подставляем: строка с минусом не будет принята.
 */
export function suggestedAmount(remaining: number): number {
  return remaining > 0 ? round2(remaining) : 0;
}

/**
 * «Поровну» (FT-023 ТЗ-3): сумма делится на части В КОПЕЙКАХ, а остаток от
 * деления достаётся первой части. 100 ₽ на три — 33,34 + 33,33 + 33,33:
 * три раза по 33,33 недосчитались бы копейки, и сохранить было бы нельзя.
 */
export function equalSplit(parentAmount: number, count: number): number[] {
  if (!(count > 0)) return [];
  const total = Math.round(Math.abs(Number(parentAmount ?? 0)) * 100);
  const share = Math.floor(total / count);
  const rest = total - share * count;
  return Array.from({ length: count }, (_, index) => (share + (index === 0 ? rest : 0)) / 100);
}

/** Доля части в процентах (два знака) — вторая сторона связки ₽ ↔ %. */
export function percentOf(amount: number, parentAmount: number): number {
  const parent = Math.abs(Number(parentAmount ?? 0));
  if (!parent) return 0;
  return Math.round((Number(amount ?? 0) / parent) * 10000) / 100;
}

/** Сумма части по проценту — в копейках, как всё в разбиении. */
export function amountFromPercent(percent: number, parentAmount: number): number {
  return round2((Math.abs(Number(parentAmount ?? 0)) * Number(percent ?? 0)) / 100);
}
