// © 2026 Bigfin
import { ChatTool, findTool } from './chatTools';

/**
 * Проверка того, что просит модель (этап 14 ТЗ).
 *
 * Модель выбирает инструмент и параметры сама — и ошибается: просит
 * несуществующий инструмент, путает названия, присылает дату «прошлый
 * квартал» словами или период длиной в двадцать лет.
 *
 * Ни одну из этих ошибок нельзя «поправить за неё». Догадка вроде «она,
 * наверное, имела в виду ОПиУ» однажды подставит не тот отчёт — и ответ
 * будет уверенным и неверным. Отказ с внятной причиной лучше.
 */

export type ToolCallProblem =
  | 'unknown_tool'
  | 'missing_param'
  | 'bad_date'
  | 'period_reversed'
  | 'period_too_long'
  | 'unknown_param';

export interface ToolCallRequest {
  tool: string;
  params?: Record<string, unknown>;
}

export interface ValidatedToolCall {
  tool: ChatTool;
  params: Record<string, string | number>;
}

export interface ToolCallRejection {
  problem: ToolCallProblem;
  /** Что именно не так — попадает в журнал и в ответ модели. */
  detail: string;
}

/**
 * Самый длинный период, который отдаём.
 *
 * Не из скупости: отчёт за двадцать лет считается минутами и всё равно не
 * помещается в ответ модели. Такой запрос — почти всегда ошибка разбора даты,
 * а не настоящее желание.
 */
export const MAX_PERIOD_DAYS = 366 * 3;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) return false;

  // «2026-02-31» проходит формат, но такой даты нет: JS молча превратит её
  // в 3 марта, и отчёт посчитается не за тот период.
  return parsed.toISOString().slice(0, 10) === value;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();

  return Math.round((b - a) / 86_400_000);
}

/**
 * Проверяет запрос модели.
 *
 * Возвращает либо готовый вызов, либо причину отказа. Причина уходит обратно
 * модели: «инструмента get_revenue нет, доступны …» она понимает и исправляется
 * со второй попытки, а молчаливый отказ заставил бы её выдумать ответ.
 */
export function validateToolCall(
  request: ToolCallRequest,
): { call: ValidatedToolCall } | { rejection: ToolCallRejection } {
  const tool = findTool(request?.tool);

  if (!tool) {
    return {
      rejection: {
        problem: 'unknown_tool',
        detail: `Инструмента «${request?.tool}» нет.`,
      },
    };
  }

  const given = request.params ?? {};
  const known = new Set(tool.params.map((param) => param.name));
  const params: Record<string, string | number> = {};

  const unknown = Object.keys(given).filter((key) => !known.has(key));

  if (unknown.length > 0) {
    // Лишний параметр не отбрасывается молча: модель думает, что сузила
    // запрос (например, «только по рекламе»), а получила бы весь отчёт
    // и приняла его за ответ на свой суженный вопрос.
    return {
      rejection: {
        problem: 'unknown_param',
        detail: `Инструмент «${tool.name}» не принимает: ${unknown.join(', ')}.`,
      },
    };
  }

  for (const param of tool.params) {
    const value = given[param.name];

    if (value === undefined || value === null || value === '') {
      if (param.required) {
        return {
          rejection: {
            problem: 'missing_param',
            detail: `Не хватает «${param.name}»: ${param.description}`,
          },
        };
      }
      continue;
    }

    if (param.type === 'date') {
      if (!isValidDate(value)) {
        return {
          rejection: {
            problem: 'bad_date',
            detail: `«${param.name}» должен быть датой ГГГГ-ММ-ДД, пришло «${value}».`,
          },
        };
      }
      params[param.name] = value;
      continue;
    }

    if (param.type === 'number') {
      const num = Number(value);

      if (!Number.isFinite(num)) {
        return {
          rejection: {
            problem: 'unknown_param',
            detail: `«${param.name}» должен быть числом.`,
          },
        };
      }
      params[param.name] = num;
      continue;
    }

    if (param.type === 'enum' && param.values && !param.values.includes(String(value))) {
      return {
        rejection: {
          problem: 'unknown_param',
          detail: `«${param.name}» может быть только: ${param.values.join(', ')}.`,
        },
      };
    }
    params[param.name] = String(value);
  }

  const from = params.fromDate as string | undefined;
  const to = params.toDate as string | undefined;

  if (from && to) {
    if (daysBetween(from, to) < 0) {
      // Перепутанные местами даты дали бы пустой отчёт, а модель сказала бы
      // «за этот период ничего не было» — и это звучало бы как факт.
      return {
        rejection: {
          problem: 'period_reversed',
          detail: `Начало периода (${from}) позже конца (${to}).`,
        },
      };
    }
    if (daysBetween(from, to) > MAX_PERIOD_DAYS) {
      return {
        rejection: {
          problem: 'period_too_long',
          detail: `Период длиннее ${MAX_PERIOD_DAYS} дней не обрабатывается.`,
        },
      };
    }
  }

  return { call: { tool, params } };
}
