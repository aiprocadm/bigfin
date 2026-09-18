// © 2026 Bigfin

/**
 * Проверка выводов модели (этап 13 ТЗ, §13.1 п. 1 и §13.4).
 *
 * ТЗ: «Модель не считает цифры. Все числа приходят из уже посчитанных
 * агрегатов Bigfin» и «Ни одно число в тексте не расходится с отчётом».
 *
 * Просто попросить модель не считать — недостаточно. Модель охотно напишет
 * «выручка выросла на 23%», сложив в уме две суммы, и ошибётся. Беда не в
 * ошибке как таковой, а в том, что НЕВЕРНОЕ ЧИСЛО ВЫГЛЯДИТ ТОЧНО ТАК ЖЕ,
 * как верное: человек примет решение по цифре, которой нет ни в одном отчёте.
 *
 * Поэтому каждое число из текста сверяется с числами, которые мы модели дали.
 * Не сошлось — вывод выбрасывается целиком. Лучше три наблюдения, чем четыре,
 * одно из которых выдумано.
 */

/** Наблюдение, как его вернула модель. */
export interface RawInsight {
  text: string;
  /** Куда ведёт (§13.1 п. 3 — каждый вывод кликабелен). */
  link?: string | null;
  reportKey?: string | null;
}

export type InsightRejection =
  | 'empty'
  | 'number_not_in_data'
  | 'no_link'
  | 'too_long';

export interface CheckedInsight extends RawInsight {
  rejection: InsightRejection | null;
  /** Числа, которых нет в данных, — для журнала. */
  unknownNumbers: number[];
}

/** Длиннее — это уже не наблюдение, а сочинение. */
export const MAX_INSIGHT_LENGTH = 220;

/** Сколько наблюдений показываем. ТЗ §13.3: 3–5. */
export const MAX_INSIGHTS = 5;
export const MIN_INSIGHTS = 3;

/**
 * Вытаскивает из текста все числа.
 *
 * Русский текст пишет числа по-разному: «2 800 000 ₽», «2,8 раза», «64%»,
 * «−180 000». Неразрывный пробел, обычный пробел, запятая как разделитель
 * дробной части, минус в виде длинного тире — всё это одно и то же число.
 */
export function extractNumbers(text: string): number[] {
  const normalized = String(text ?? '')
    // Разделители разрядов: обычный и неразрывный пробелы внутри числа.
    .replace(/(\d)[\s  ](?=\d{3}\b)/g, '$1')
    // Минус может прийти длинным тире или знаком «минус».
    .replace(/[−–—]/g, '-');

  const found = normalized.match(/-?\d+(?:[.,]\d+)?/g) ?? [];

  return found.map((raw) => Number(raw.replace(',', '.')));
}

/**
 * Считается ли число «тем же самым».
 *
 * Допуск нужен потому, что в тексте число округлено: агрегат 2 803 411 ₽
 * человек читает как «2,8 млн». Требовать точного совпадения значило бы
 * выбрасывать все нормальные формулировки.
 *
 * Допуск ОТНОСИТЕЛЬНЫЙ (1%), а не постоянный: для 180 000 ₽ абсолютный допуск
 * в тысячу — мелочь, а для доли в 3% — половина значения.
 */
const RELATIVE_TOLERANCE = 0.01;

export function matchesKnownNumber(value: number, known: number[]): boolean {
  return known.some((candidate) => {
    if (candidate === value) return true;

    const scale = Math.max(Math.abs(candidate), Math.abs(value));

    if (scale === 0) return false;

    return Math.abs(candidate - value) / scale <= RELATIVE_TOLERANCE;
  });
}

/**
 * Небольшие целые числа, которые встречаются в любом тексте и ничего не
 * утверждают: «третий месяц», «в 2 раза», «за 3 квартала».
 *
 * Их не сверяем — иначе выбросим все живые формулировки. Порог низкий
 * намеренно: суммы и проценты, ради которых всё затевалось, крупнее.
 */
const TRIVIAL_LIMIT = 12;

function isTrivial(value: number): boolean {
  return Number.isInteger(value) && Math.abs(value) <= TRIVIAL_LIMIT;
}

/**
 * Собирает все числа, которые мы модели давали.
 *
 * Берёт их из СТРУКТУРЫ агрегатов, а не из текста промпта: промпт может быть
 * отформатирован как угодно, а данные — это данные.
 */
export function collectKnownNumbers(data: unknown): number[] {
  const numbers: number[] = [];

  const walk = (value: unknown): void => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      numbers.push(value);
      // Доли часто приходят как 0.31, а в тексте стоят как «31%».
      // Это одно и то же число, и текст не должен за это отбраковываться.
      if (Math.abs(value) <= 1) numbers.push(value * 100);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach(walk);
    }
  };

  walk(data);

  return numbers;
}

/**
 * Проверяет одно наблюдение.
 *
 * Возвращает ПРИЧИНУ отказа, а не просто «плохо»: причины пишутся в журнал,
 * и по ним видно, что именно модель делает не так — выдумывает числа или
 * забывает ссылку.
 */
export function checkInsight(
  insight: RawInsight,
  knownNumbers: number[],
): CheckedInsight {
  const text = String(insight.text ?? '').trim();

  if (!text) {
    return { ...insight, text, rejection: 'empty', unknownNumbers: [] };
  }
  if (text.length > MAX_INSIGHT_LENGTH) {
    return { ...insight, text, rejection: 'too_long', unknownNumbers: [] };
  }

  const unknownNumbers = extractNumbers(text)
    .filter((value) => !isTrivial(value))
    .filter((value) => !matchesKnownNumber(value, knownNumbers));

  if (unknownNumbers.length > 0) {
    return { ...insight, text, rejection: 'number_not_in_data', unknownNumbers };
  }

  // §13.1 п. 3: каждый вывод кликабелен и ведёт в отчёт. Вывод без ссылки
  // нечем проверить — а непроверяемое утверждение о деньгах хуже молчания.
  if (!insight.link) {
    return { ...insight, text, rejection: 'no_link', unknownNumbers: [] };
  }

  return { ...insight, text, rejection: null, unknownNumbers: [] };
}

/**
 * Оставляет только пригодные наблюдения.
 *
 * Если после проверки осталось меньше трёх (§13.3 просит 3–5), отдаём то, что
 * есть, — вплоть до пустоты. Добирать выброшенные обратно, чтобы «набрать
 * количество», значило бы вернуть в отчёт ровно те выводы, которые мы
 * признали недостоверными.
 */
export function selectInsights(
  insights: RawInsight[],
  data: unknown,
): { accepted: CheckedInsight[]; rejected: CheckedInsight[] } {
  const known = collectKnownNumbers(data);
  const checked = (insights ?? []).map((insight) =>
    checkInsight(insight, known),
  );

  return {
    accepted: checked
      .filter((insight) => insight.rejection === null)
      .slice(0, MAX_INSIGHTS),
    rejected: checked.filter((insight) => insight.rejection !== null),
  };
}
