// © 2026 Bigfin
import { CHAT_TOOLS } from './chatTools';

/**
 * Запрос к модели в чате (этап 14 ТЗ).
 *
 * Модель на каждом круге делает одно из двух: просит инструмент или отвечает.
 * Промпт требует от неё именно такого выбора — без него она пытается делать
 * и то и другое сразу, и разобрать это надёжно нельзя.
 */

export interface ChatPromptInput {
  question: string;
  /** Что уже произошло: какие инструменты звали и что вернули. */
  transcript: string[];
}

const RULES = [
  'Ты помогаешь владельцу бизнеса разобраться в его цифрах. Отвечай по-русски.',
  'НИЧЕГО НЕ СЧИТАЙ САМ и не складывай числа. Все цифры бери только из того,',
  'что вернули инструменты. Если нужного числа нет — попроси нужный инструмент.',
  'Отвечай коротко: одно-три предложения.',
  '',
  'На каждом шаге верни СТРОГО ОДИН JSON-объект, без пояснений вокруг:',
  '- чтобы получить данные: {"tool":"имя","params":{...}}',
  '- чтобы ответить человеку: {"answer":"текст ответа"}',
].join('\n');

export function buildChatPrompt(input: ChatPromptInput): string {
  const tools = CHAT_TOOLS.map((tool) => {
    const params = tool.params
      .map((p) => `${p.name} (${p.type}${p.required ? ', обязателен' : ''})`)
      .join(', ');

    return `- ${tool.name}: ${tool.description} Параметры: ${params || 'нет'}.`;
  });

  const parts = [RULES, '', 'Доступные инструменты:', ...tools, ''];

  if (input.transcript.length > 0) {
    parts.push('Что уже известно:', ...input.transcript, '');
  }
  parts.push(`Вопрос: ${input.question}`);

  return parts.join('\n');
}

export type ModelStep =
  | { kind: 'answer'; text: string }
  | { kind: 'tool'; call: { tool: string; params?: Record<string, unknown> } };

/**
 * Разбирает шаг модели.
 *
 * Неразобранный шаг трактуется как ПУСТОЙ ОТВЕТ, а не как вызов инструмента:
 * догадываться, какой инструмент она имела в виду, — прямой путь к уверенному
 * неверному ответу по не тому отчёту.
 */
export function parseModelStep(raw: string): ModelStep {
  const text = String(raw ?? '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    return { kind: 'answer', text: '' };
  }

  try {
    const parsed = JSON.parse(text.slice(start, end + 1));

    if (parsed && typeof parsed.answer === 'string') {
      return { kind: 'answer', text: parsed.answer.trim() };
    }
    if (parsed && typeof parsed.tool === 'string') {
      return {
        kind: 'tool',
        call: { tool: parsed.tool, params: parsed.params ?? {} },
      };
    }
    return { kind: 'answer', text: '' };
  } catch {
    return { kind: 'answer', text: '' };
  }
}
