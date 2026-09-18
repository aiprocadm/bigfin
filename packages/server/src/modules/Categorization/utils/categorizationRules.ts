// © 2026 Bigfin
/**
 * Подсказка статьи по истории (этап 12 ТЗ).
 *
 * ТЗ решает прямо: **без внешнего ИИ**. Задача классическая — по контрагенту
 * и назначению платежа предсказать статью, — и большая языковая модель тут
 * не нужна. Локальное решение выигрывает по трём причинам: данные не покидают
 * контур (важно для тех, кто ставит продукт на свой сервер), нет платы за
 * обращения, и подсказку можно объяснить словами.
 *
 * Здесь только правила, без базы.
 */

/** Одна прошлая разноска: кому платили, что написали, в какую статью отнесли. */
export interface HistoryRecord {
  contactId?: number | null;
  note?: string | null;
  articleId: number;
}

export interface Suggestion {
  articleId: number;
  /** Доля 0..1. */
  confidence: number;
  /** Почему предложено — человеку, а не в журнал. */
  reason: 'contact' | 'words';
  /** Сколько прошлых операций подтверждают подсказку. */
  matched: number;
  /** Из скольких. */
  total: number;
}

/**
 * Порог уверенности из ТЗ: ниже 70% подсказка не показывается.
 *
 * Правило жёсткое и важное: «пользователь никогда не должен видеть
 * неуверенную догадку». Неверная подсказка хуже её отсутствия — человек
 * принимает её одним щелчком и получает неверный отчёт, сам того не заметив.
 */
export const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Доля, при которой совпадение по контрагенту считается надёжным (ТЗ §12.1).
 */
export const CONTACT_CONFIDENCE = 0.9;

/** Сколько прошлых операций нужно, чтобы вообще что-то утверждать. */
export const MIN_HISTORY = 3;

/**
 * Подсказка по контрагенту.
 *
 * Покрывает большинство случаев: платежи одному и тому же контрагенту почти
 * всегда идут в одну статью.
 *
 * **Мало истории — молчим.** Две операции из двух дают «100% уверенности»,
 * которая ничего не значит: следующая же операция может оказаться другой.
 */
export function suggestByContact(
  contactId: number | null | undefined,
  history: HistoryRecord[],
): Suggestion | null {
  if (contactId == null) return null;

  const own = (history ?? []).filter(
    (record) => Number(record.contactId) === Number(contactId),
  );
  if (own.length < MIN_HISTORY) return null;

  const counts = new Map<number, number>();
  own.forEach((record) => {
    const articleId = Number(record.articleId);
    counts.set(articleId, (counts.get(articleId) ?? 0) + 1);
  });

  let bestArticle = 0;
  let bestCount = 0;
  counts.forEach((count, articleId) => {
    if (count > bestCount) {
      bestCount = count;
      bestArticle = articleId;
    }
  });

  const confidence = bestCount / own.length;
  if (confidence < CONTACT_CONFIDENCE) return null;

  return {
    articleId: bestArticle,
    confidence,
    reason: 'contact',
    matched: bestCount,
    total: own.length,
  };
}

/**
 * Слова назначения платежа.
 *
 * Числа и короткие обрывки выбрасываются: номер счёта и «ООО» встречаются
 * везде и не помогают отличить аренду от закупки, зато уверенно засоряют
 * модель.
 */
export function extractWords(note: string | null | undefined): string[] {
  return String(note ?? '')
    .toLowerCase()
    .split(/[^a-zа-яё0-9]+/i)
    .filter((word) => word.length >= 4)
    .filter((word) => !/^\d+$/.test(word));
}

/** Веса слов по статьям — то, что хранится в модели тенанта. */
export type WordWeights = Map<number, Map<string, number>>;

/**
 * Обучение: считаем, сколько раз каждое слово встречалось в каждой статье.
 */
export function trainWordWeights(history: HistoryRecord[]): WordWeights {
  const weights: WordWeights = new Map();

  (history ?? []).forEach((record) => {
    const articleId = Number(record.articleId);
    const byWord = weights.get(articleId) ?? new Map<string, number>();

    extractWords(record.note).forEach((word) => {
      byWord.set(word, (byWord.get(word) ?? 0) + 1);
    });
    weights.set(articleId, byWord);
  });

  return weights;
}

/**
 * Подсказка по словам назначения платежа — наивный байесовский классификатор.
 *
 * Сглаживание обязательно: без него одно незнакомое слово обнуляет всю
 * вероятность статьи, и классификатор молчит там, где мог бы подсказать.
 */
export function suggestByWords(
  note: string | null | undefined,
  weights: WordWeights,
): Suggestion | null {
  const words = extractWords(note);
  if (words.length === 0 || weights.size === 0) return null;

  const scores = new Map<number, number>();

  weights.forEach((byWord, articleId) => {
    const totalWords = [...byWord.values()].reduce((sum, n) => sum + n, 0);
    const vocabulary = byWord.size || 1;

    // Логарифмы, а не произведение: у длинного назначения платежа
    // произведение вероятностей превращается в ноль на любом языке.
    let score = 0;
    words.forEach((word) => {
      const seen = byWord.get(word) ?? 0;
      score += Math.log((seen + 1) / (totalWords + vocabulary));
    });
    scores.set(articleId, score);
  });

  // Переводим оценки в доли, чтобы порог уверенности имел смысл.
  const values = [...scores.values()];
  const max = Math.max(...values);
  const exps = new Map<number, number>();
  let sum = 0;
  scores.forEach((score, articleId) => {
    const value = Math.exp(score - max);
    exps.set(articleId, value);
    sum += value;
  });

  let bestArticle = 0;
  let bestShare = 0;
  exps.forEach((value, articleId) => {
    const share = value / sum;
    if (share > bestShare) {
      bestShare = share;
      bestArticle = articleId;
    }
  });

  return {
    articleId: bestArticle,
    confidence: bestShare,
    reason: 'words',
    matched: 0,
    total: 0,
  };
}

/**
 * Итоговая подсказка.
 *
 * Контрагент важнее слов: совпадение по контрагенту объяснимо человеку
 * («12 из 14 платежей этому контрагенту шли в эту статью»), а совпадение по
 * словам — нет. При равной пользе выбираем то, что можно объяснить.
 *
 * Ниже порога — **не подсказываем вовсе**, а не показываем «вероятно».
 */
export function suggestArticle(
  input: { contactId?: number | null; note?: string | null },
  history: HistoryRecord[],
  weights?: WordWeights,
): Suggestion | null {
  const byContact = suggestByContact(input.contactId, history);
  if (byContact) return byContact;

  const byWords = suggestByWords(
    input.note,
    weights ?? trainWordWeights(history),
  );

  if (!byWords) return null;
  if (byWords.confidence < CONFIDENCE_THRESHOLD) return null;

  return byWords;
}
