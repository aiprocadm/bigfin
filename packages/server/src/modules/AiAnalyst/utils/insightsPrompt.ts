// © 2026 Bigfin
import { assertNoPrivateData } from './aiPrivacy';

/**
 * Сборка запроса к модели (этап 13 ТЗ, §13.1 и §13.3).
 *
 * Промпт написан по-русски и требует от модели ровно одного: сформулировать
 * наблюдение по УЖЕ ПОСЧИТАННЫМ числам. Считать ей запрещено прямо в тексте
 * запроса — и, что важнее, её ответ всё равно проверяется числами
 * (`insightValidation.ts`). Просьба в промпте — это вежливость, а не защита.
 */

/** Строка агрегата: только то, что разрешено отправлять. */
export interface AggregateRow {
  label: string;
  amount?: number;
  previousAmount?: number;
  changePercent?: number;
  share?: number;
  month?: string;
  reportKey?: string;
  link?: string;
}

export interface InsightsPromptInput {
  period: string;
  rows: AggregateRow[];
}

const SYSTEM_RULES = [
  'Ты финансовый аналитик. Пиши по-русски, коротко и по делу.',
  'НИЧЕГО НЕ СЧИТАЙ. Используй только те числа, что даны ниже.',
  'Если нужного числа в данных нет — не пиши его вовсе.',
  'Дай от 3 до 5 наблюдений. Каждое — одно-два предложения.',
  'В каждом наблюдении укажи, что это значит для владельца бизнеса.',
  'Не обращайся к читателю по имени и не выдумывай названий компаний.',
  'Ответ верни строго как JSON-массив объектов вида',
  '[{"text":"...","reportKey":"profit_loss"}].',
].join('\n');

/**
 * Собирает промпт.
 *
 * ПЕРЕД сборкой данные проверяются на приватные поля и, если что-то нашлось,
 * сборка ЛОМАЕТСЯ. Проверка стоит здесь, в единственной точке, где данные
 * превращаются в текст для отправки наружу: поставь её в вызывающем коде — и
 * однажды появится второй вызывающий, который забудет её сделать.
 */
export function buildInsightsPrompt(input: InsightsPromptInput): string {
  assertNoPrivateData(input.rows);

  const lines = input.rows.map((row) => {
    const parts = [row.label];

    if (row.month) parts.push(`месяц ${row.month}`);
    if (row.amount !== undefined) parts.push(`сумма ${row.amount}`);
    if (row.previousAmount !== undefined) {
      parts.push(`было ${row.previousAmount}`);
    }
    if (row.changePercent !== undefined) {
      parts.push(`изменение ${row.changePercent}%`);
    }
    if (row.share !== undefined) parts.push(`доля ${row.share}`);

    return `- ${parts.join('; ')}`;
  });

  return [
    SYSTEM_RULES,
    '',
    `Период: ${input.period}.`,
    'Данные:',
    ...lines,
  ].join('\n');
}

/**
 * Разбирает ответ модели.
 *
 * Модель почти всегда оборачивает JSON в пояснения и в ограждение из трёх
 * обратных кавычек, хотя её просили этого не делать. Падать на этом нельзя:
 * сутки без выводов из-за лишней строки — плохой обмен.
 *
 * А вот выдумывать наблюдения из неразобранного текста — НЕЛЬЗЯ: не разобрали
 * значит не разобрали, пусть будет пусто.
 */
export function parseInsightsResponse(
  raw: string,
): Array<{ text: string; reportKey?: string | null }> {
  const text = String(raw ?? '').trim();

  if (!text) return [];

  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');

  if (start === -1 || end === -1 || end < start) return [];

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        text: String(item?.text ?? '').trim(),
        reportKey: item?.reportKey ? String(item.reportKey) : null,
      }))
      .filter((item) => item.text.length > 0);
  } catch {
    return [];
  }
}
