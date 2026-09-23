// © 2026 Bigfin
import * as moment from 'moment';

/**
 * Инструменты MCP-сервера (FT-090 ТЗ-3) — ТОЛЬКО ЧТЕНИЕ.
 *
 * Каждый инструмент — один GET существующей ручки публичного API (таблица
 * FT-090). Своих расчётов здесь нет и быть не должно: агент обязан получить
 * те же числа, что человек на экране. Сторожа: `mcpToolsMirrorApi.spec.ts`
 * (ручка существует и помечена тем же правом токена), `mcpReadOnly.spec.ts`
 * (ни одного пишущего метода).
 */
type ArgType = 'date' | 'integer' | 'boolean' | 'integerArray' | 'string';

interface ArgSpec {
  type: ArgType;
  description: string;
  enum?: string[];
  /** Как параметр называется в ручке, если иначе. */
  param?: string;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  /** Ручка публичного API; `:id` подставляется из аргумента `id`. */
  endpoint: string;
  method: 'GET';
  /** Право токена, которое проверит ручка (для инструкции и сторожа). */
  scope: 'reports:read' | 'transactions:read';
  args: Record<string, ArgSpec>;
  required?: string[];
  /** Период по умолчанию, если агент его не назвал. */
  defaultPeriod?: 'previousMonth' | 'yearToDate' | 'today';
  inputSchema: object;
}

const LEGAL_ENTITIES: ArgSpec = {
  type: 'integerArray',
  description: 'Юрлица (номера). Не указано — сводно по всей группе.',
};
const PROJECTS: ArgSpec = {
  type: 'integerArray',
  param: 'projectsIds',
  description: 'Направления (номера). Не указано — все операции.',
};
const FROM: ArgSpec = { type: 'date', description: 'Начало периода, ГГГГ-ММ-ДД.' };
const TO: ArgSpec = { type: 'date', description: 'Конец периода, ГГГГ-ММ-ДД.' };
const DATE_GROUP: ArgSpec = {
  type: 'string',
  enum: ['day', 'week', 'month', 'quarter', 'year', 'total'],
  description: 'Колонки-периоды. По умолчанию — месяцы.',
};

function schemaOf(args: Record<string, ArgSpec>, required: string[] = []): object {
  const properties: Record<string, object> = {};
  for (const [name, spec] of Object.entries(args)) {
    const base =
      spec.type === 'integerArray'
        ? { type: 'array', items: { type: 'integer' } }
        : spec.type === 'date'
          ? { type: 'string', format: 'date' }
          : { type: spec.type === 'integer' ? 'integer' : spec.type };
    properties[name] = { ...base, description: spec.description, ...(spec.enum ? { enum: spec.enum } : {}) };
  }
  return { type: 'object', properties, required, additionalProperties: false };
}

const tool = (t: Omit<McpTool, 'inputSchema' | 'method'>): McpTool => ({
  ...t,
  method: 'GET',
  inputSchema: schemaOf(t.args, t.required),
});

export const MCP_TOOLS: McpTool[] = [
  tool({
    name: 'get_cash_flow',
    title: 'Деньги по статьям (ОДДС)',
    description:
      'Отчёт о движении денег по статьям за период: поступления, выплаты, сальдо, остатки на начало и конец. ' +
      'Те же числа, что в разделе «Отчёты → Деньги по статьям». Без дат — прошлый месяц.',
    endpoint: 'reports/cash-flow-articles',
    scope: 'reports:read',
    defaultPeriod: 'previousMonth',
    args: {
      fromDate: FROM,
      toDate: TO,
      dateGroup: DATE_GROUP,
      group: {
        type: 'string',
        enum: ['articles', 'activity', 'contacts', 'accounts', 'directions', 'directions_articles'],
        description: 'Разрез строк. По умолчанию — статьи.',
      },
      legalEntityIds: LEGAL_ENTITIES,
      projectIds: PROJECTS,
    },
  }),
  tool({
    name: 'get_managerial_pnl',
    title: 'Управленческий ОПиУ',
    description:
      'Управленческий отчёт о прибылях и убытках с ярусами МД → ВП1 → ВП2 → ОП → ЧП за период. ' +
      'Без дат — прошлый месяц.',
    endpoint: 'reports/managerial-profit-loss',
    scope: 'reports:read',
    defaultPeriod: 'previousMonth',
    args: {
      fromDate: FROM,
      toDate: TO,
      dateGroup: DATE_GROUP,
      basis: { type: 'string', enum: ['accrual', 'cash'], description: 'Метод: начисление (по умолчанию) или кассовый.' },
      legalEntityIds: LEGAL_ENTITIES,
      projectIds: PROJECTS,
    },
  }),
  tool({
    name: 'get_balance_sheet',
    title: 'Баланс',
    description: 'Баланс: активы, обязательства и капитал на дату. Без дат — с начала года по сегодня.',
    endpoint: 'reports/balance-sheet',
    scope: 'reports:read',
    defaultPeriod: 'yearToDate',
    args: { fromDate: FROM, toDate: { ...TO, description: 'Дата баланса, ГГГГ-ММ-ДД.' }, legalEntityIds: LEGAL_ENTITIES },
  }),
  tool({
    name: 'get_cash_gaps',
    title: 'Кассовые разрывы',
    description:
      'Прогноз кассовых разрывов по счетам: когда остаток уйдёт в минус и насколько глубоко. Окно — от сегодня.',
    endpoint: 'payment-calendar/cash-gaps',
    scope: 'reports:read',
    args: { horizonDays: { type: 'integer', description: 'Горизонт прогноза в днях, 7–365. По умолчанию 90.' } },
  }),
  tool({
    name: 'get_debts',
    title: 'Долги',
    description: 'Долги нам и наши: итоги, просрочка по срокам, крупнейшие должники и кредиторы на дату.',
    endpoint: 'debts/overview',
    scope: 'reports:read',
    args: {
      side: { type: 'string', enum: ['receivable', 'payable'], description: 'Только нам должны или только мы. Не указано — обе стороны.' },
      asDate: { type: 'date', description: 'На какую дату, ГГГГ-ММ-ДД. По умолчанию — сегодня.' },
    },
  }),
  tool({
    name: 'list_transactions',
    title: 'Операции',
    description: 'Список операций по всем денежным счетам с отбором и страницами (по 50).',
    endpoint: 'banking/transactions',
    scope: 'transactions:read',
    args: {
      fromDate: FROM,
      toDate: TO,
      accountId: { type: 'integer', description: 'Денежный счёт. Не указано — все счета.' },
      articleId: { type: 'integer', description: 'Статья.' },
      projectId: { type: 'integer', description: 'Направление.' },
      contactId: { type: 'integer', description: 'Контрагент.' },
      flow: { type: 'string', enum: ['in', 'out'], description: 'Только поступления или только выплаты.' },
      search: { type: 'string', description: 'Поиск по назначению, контрагенту, номеру.' },
      page: { type: 'integer', description: 'Страница, с 1.' },
    },
  }),
  tool({
    name: 'get_articles',
    title: 'Статьи',
    description: 'Справочник управленческих статей: доходы, расходы, активы, обязательства, капитал.',
    endpoint: 'management-articles',
    scope: 'reports:read',
    args: {
      kind: { type: 'string', enum: ['income', 'expense', 'asset', 'liability', 'equity'], description: 'Вид статей.' },
      tree: { type: 'boolean', description: 'Деревом (true) или плоским списком.' },
    },
  }),
  tool({
    name: 'get_budget_plan_fact',
    title: 'План-факт бюджета',
    description: 'План, факт и отклонение по статьям бюджета за период. Номер бюджета обязателен.',
    endpoint: 'budgets/:id/plan-fact',
    scope: 'reports:read',
    defaultPeriod: 'previousMonth',
    required: ['id'],
    args: {
      id: { type: 'integer', description: 'Номер бюджета.' },
      fromDate: FROM,
      toDate: TO,
      scenario: {
        type: 'string',
        enum: ['optimistic', 'realistic', 'pessimistic'],
        description: 'Сценарий. По умолчанию — активный сценарий бюджета.',
      },
    },
  }),
];

export interface BuiltToolRequest {
  path: string;
  query: URLSearchParams;
  period: { fromDate: string; toDate: string } | null;
  filters: Record<string, unknown>;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function defaultPeriodOf(kind: McpTool['defaultPeriod']): { fromDate: string; toDate: string } | null {
  if (kind === 'previousMonth') {
    const month = moment().subtract(1, 'month');
    return { fromDate: month.startOf('month').format('YYYY-MM-DD'), toDate: month.endOf('month').format('YYYY-MM-DD') };
  }
  if (kind === 'yearToDate') {
    return { fromDate: moment().startOf('year').format('YYYY-MM-DD'), toDate: moment().format('YYYY-MM-DD') };
  }
  return null;
}

/**
 * Аргументы агента → адрес ручки. Ошибка в аргументах — понятный текст, а не
 * запрос «наугад»: ручка отбросила бы непонятный параметр молча, и агент
 * получил бы отчёт не за тот период.
 */
export function buildToolRequest(tool: McpTool, args: Record<string, unknown>): BuiltToolRequest | { error: string } {
  for (const name of Object.keys(args)) {
    if (!tool.args[name]) {
      return { error: `У инструмента «${tool.name}» нет параметра «${name}». Есть: ${Object.keys(tool.args).join(', ')}.` };
    }
  }
  for (const name of tool.required ?? []) {
    if (args[name] === undefined || args[name] === null || args[name] === '') {
      return { error: `Не указан обязательный параметр «${name}».` };
    }
  }

  const values: Record<string, unknown> = { ...args };
  const period = defaultPeriodOf(tool.defaultPeriod);
  if (period && tool.args.fromDate && values.fromDate === undefined && values.toDate === undefined) {
    values.fromDate = period.fromDate;
    values.toDate = period.toDate;
  }

  const query = new URLSearchParams();
  const filters: Record<string, unknown> = {};
  let path = tool.endpoint;

  for (const [name, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue;
    const spec = tool.args[name];
    if (spec.type === 'date' && !(typeof value === 'string' && DATE_RE.test(value) && moment(value, 'YYYY-MM-DD', true).isValid())) {
      return { error: `Параметр «${name}» — дата в виде ГГГГ-ММ-ДД, получено: ${JSON.stringify(value)}.` };
    }
    if (spec.type === 'integer' && !Number.isInteger(Number(value))) {
      return { error: `Параметр «${name}» — целое число, получено: ${JSON.stringify(value)}.` };
    }
    if (spec.type === 'integerArray') {
      const list = Array.isArray(value) ? value : [value];
      if (!list.every((v) => Number.isInteger(Number(v)))) {
        return { error: `Параметр «${name}» — список целых чисел.` };
      }
    }
    if (spec.enum && !spec.enum.includes(String(value))) {
      return { error: `Параметр «${name}» — одно из: ${spec.enum.join(', ')}.` };
    }

    if (name === 'id' && path.includes(':id')) {
      path = path.replace(':id', String(Number(value)));
      continue;
    }
    const param = spec.param ?? name;
    if (spec.type === 'integerArray') {
      (Array.isArray(value) ? value : [value]).forEach((v) => query.append(`${param}[]`, String(Number(v))));
    } else {
      query.append(param, String(value));
    }
    if (name !== 'fromDate' && name !== 'toDate') filters[name] = value;
  }

  const hasPeriod = typeof values.fromDate === 'string' && typeof values.toDate === 'string';
  return {
    path,
    query,
    period: hasPeriod ? { fromDate: String(values.fromDate), toDate: String(values.toDate) } : null,
    filters,
  };
}

/**
 * Контекст ответа (бизнес-правило FT-090): период, фильтры, юрлица, валюта,
 * время расчёта — чтобы агент не выдумал контекст, а пересказал его.
 */
export function toolMeta(tool: McpTool, built: BuiltToolRequest, payload: any, computedAt: string) {
  const reportMeta = payload?.meta ?? {};
  return {
    tool: tool.name,
    source: `GET /api/${built.path}`,
    period: built.period,
    filters: built.filters,
    legalEntities: (built.filters.legalEntityIds as number[] | undefined) ?? 'все (сводно)',
    legalEntityScope: reportMeta.legal_entity_scope ?? null,
    currency: reportMeta.base_currency ?? payload?.base_currency ?? null,
    computedAt,
  };
}
