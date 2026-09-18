// © 2026 Bigfin
/**
 * Разделение операции на части (этап 10 ТЗ).
 *
 * Одна платёжка на 100 000 ₽ = аренда 70 000 + коммунальные 30 000. Сегодня
 * операция целиком уходит в одну статью, и отчёты врут.
 *
 * Здесь только правила, без базы. Всё, что тут может сломаться, ломается
 * молча: суммы, которые «почти сходятся», выглядят нормально, а отчёт
 * расходится с банком на копейки — и эти копейки ищут часами.
 */

/** Одна часть разделённой операции. */
export interface SplitLine {
  amount: number;
  articleId?: number | null;
  projectId?: number | null;
  legalEntityId?: number | null;
}

export interface SplitValidation {
  /** Сумма частей. */
  distributed: number;
  /** Сколько осталось распределить (может быть отрицательным — перебор). */
  remaining: number;
  /** Можно ли сохранять. */
  isValid: boolean;
  /** Почему нельзя, если нельзя. */
  problem:
    | 'empty'
    | 'not_distributed'
    | 'over_distributed'
    | 'non_positive_line'
    | 'article_missing'
    | null;
}

/**
 * Копейки. Суммы приходят числами с плавающей точкой, и 0.1 + 0.2 даёт
 * 0.30000000000000004. Сравнивать такие суммы «в лоб» нельзя — кнопка
 * сохранения не нажмётся никогда, и человек не поймёт почему.
 *
 * Округление до копеек ДО сравнения решает это полностью: отдельный допуск
 * поверх него был бы мёртвой страховкой, которую ничто не проверяет.
 */
const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Проверяет разбиение операции.
 *
 * Правило ТЗ жёсткое: суммы частей ОБЯЗАНЫ сходиться с родительской. Иначе
 * в отчёты уйдёт одна сумма, а в сверку с банком — другая, и расхождение
 * будет выглядеть как ошибка банка.
 */
export function validateSplits(
  parentAmount: number,
  lines: SplitLine[],
): SplitValidation {
  const rows = lines ?? [];
  const distributed = round2(
    rows.reduce((sum, line) => sum + Number(line.amount ?? 0), 0),
  );
  const remaining = round2(Number(parentAmount ?? 0) - distributed);

  const base = { distributed, remaining };

  if (rows.length === 0) {
    return { ...base, isValid: false, problem: 'empty' };
  }

  // Нулевая или отрицательная часть — это не разделение, а описка.
  // Отрицательная вдобавок позволила бы «сойтись» любой ерунде.
  if (rows.some((line) => Number(line.amount ?? 0) <= 0)) {
    return { ...base, isValid: false, problem: 'non_positive_line' };
  }

  // Часть без статьи бессмысленна: ради статей разделение и затевалось.
  if (rows.some((line) => line.articleId == null)) {
    return { ...base, isValid: false, problem: 'article_missing' };
  }

  if (remaining === 0) {
    return { ...base, remaining: 0, isValid: true, problem: null };
  }

  return {
    ...base,
    isValid: false,
    problem: remaining > 0 ? 'not_distributed' : 'over_distributed',
  };
}

/**
 * Делит сумму по процентам — для автоматических правил разноски
 * (`BankRules`, §10 ТЗ).
 *
 * **Остаток от округления отдаётся последней части.** Три доли по 33,33% от
 * 100 ₽ дают 99,99 ₽, и без этого правила разбиение никогда не сойдётся с
 * родительской суммой, а правило разноски будет молча отказывать.
 */
export function splitByPercentages(
  amount: number,
  percentages: number[],
): number[] {
  const shares = (percentages ?? []).map(Number).filter((p) => p > 0);
  if (shares.length === 0) return [];

  const total = shares.reduce((sum, share) => sum + share, 0);
  // Проценты тоже округляем: 33.33 + 33.33 + 33.34 в плавающей точке
  // даёт 99.99999999999999.
  if (round2(total) !== 100) return [];

  const parts = shares.map((share) => round2((Number(amount) * share) / 100));

  const distributed = round2(parts.reduce((sum, part) => sum + part, 0));
  const drift = round2(Number(amount) - distributed);

  if (drift !== 0) {
    parts[parts.length - 1] = round2(parts[parts.length - 1] + drift);
  }
  return parts;
}
