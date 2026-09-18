// © 2026 Bigfin
import {
  collectKnownNumbers,
  extractNumbers,
} from '@/modules/AiAnalyst/utils/insightValidation';

/**
 * Проверка ответа чата (этап 14 ТЗ; ограничения §13.1 действуют полностью).
 *
 * Та же беда, что и у выводов аналитика, только острее: человек СПРОСИЛ и
 * ждёт числа. Ответ «на рекламу ушло 340 000 ₽» он примет как факт и не
 * пойдёт сверять с отчётом — ради того и спрашивал.
 *
 * Поэтому каждое число ответа сверяется с тем, что вернули инструменты.
 * Не сошлось — ответ НЕ ПОКАЗЫВАЕТСЯ вовсе. Не «показываем с оговоркой»:
 * оговорку человек не прочитает, а число запомнит.
 */

/** Сколько раз подряд модель может просить инструменты. */
export const MAX_TOOL_ROUNDS = 4;

/**
 * Мелкие целые, которые ничего не утверждают: «за 3 месяца», «в 2 раза».
 * Порог тот же, что у выводов аналитика.
 */
const TRIVIAL_LIMIT = 12;

/**
 * Числа, которые человек сам назвал в вопросе.
 *
 * «Сколько потратили на рекламу в 2026 году?» — 2026 придёт в ответе, и
 * отбраковывать его нелепо: это не утверждение модели, а эхо вопроса.
 */
function questionNumbers(question: string): number[] {
  return extractNumbers(question);
}

export type AnswerRejection = 'empty' | 'number_not_in_data' | 'no_source';

export interface CheckedAnswer {
  text: string;
  rejection: AnswerRejection | null;
  unknownNumbers: number[];
}

const RELATIVE_TOLERANCE = 0.01;

function matches(value: number, known: number[]): boolean {
  return known.some((candidate) => {
    if (candidate === value) return true;

    const scale = Math.max(Math.abs(candidate), Math.abs(value));

    return scale > 0 && Math.abs(candidate - value) / scale <= RELATIVE_TOLERANCE;
  });
}

export interface CheckAnswerInput {
  text: string;
  question: string;
  /** Всё, что вернули инструменты за разговор. */
  toolResults: unknown[];
  /** Ссылки на отчёты, по которым отвечали. */
  links: string[];
}

/**
 * Годится ли ответ для показа.
 *
 * Требование ссылки — не украшение: ТЗ говорит «ответ всегда сопровождается
 * ссылкой на отчёт». Ответ без источника нечем проверить, а значит, и
 * оспорить: он звучит как истина и ею не является.
 */
export function checkAnswer(input: CheckAnswerInput): CheckedAnswer {
  const text = String(input.text ?? '').trim();

  if (!text) {
    return { text, rejection: 'empty', unknownNumbers: [] };
  }

  if (!input.links || input.links.length === 0) {
    return { text, rejection: 'no_source', unknownNumbers: [] };
  }

  const known = [
    ...collectKnownNumbers(input.toolResults),
    ...questionNumbers(input.question ?? ''),
  ];

  const unknownNumbers = extractNumbers(text)
    .filter((value) => !(Number.isInteger(value) && Math.abs(value) <= TRIVIAL_LIMIT))
    .filter((value) => !matches(value, known));

  if (unknownNumbers.length > 0) {
    return { text, rejection: 'number_not_in_data', unknownNumbers };
  }

  return { text, rejection: null, unknownNumbers: [] };
}

/** Что показать человеку вместо забракованного ответа. */
export const ANSWER_FALLBACK: Record<AnswerRejection, string> = {
  empty: 'Не удалось получить ответ. Попробуйте переспросить другими словами.',
  number_not_in_data:
    'Ответ получился с числами, которых нет в отчётах, поэтому показывать ' +
    'его нельзя. Откройте отчёт по ссылке — там цифры точные.',
  no_source:
    'Не удалось определить, по какому отчёту отвечать. Уточните период ' +
    'или задайте вопрос конкретнее.',
};
