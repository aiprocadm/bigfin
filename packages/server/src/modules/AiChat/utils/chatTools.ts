// © 2026 Bigfin

/**
 * Инструменты ИИ-чата (этап 14 ТЗ).
 *
 * ТЗ: «модель не получает доступ к базе. Ей даётся набор инструментов
 * (function calling), каждый из которых — вызов существующего API отчётов с
 * параметрами».
 *
 * Почему именно так, а не «пусть модель напишет SQL». Модель, которой дали
 * доступ к базе, рано или поздно напишет запрос, который вернёт не то, что
 * она думает, — и объяснит результат уверенно. Здесь же она может выбрать
 * только из перечисленного, а считают по-прежнему наши отчёты: тот же расчёт,
 * что человек видит на экране. Потому и ответ всегда сходится с отчётом.
 */

export type ChatToolParamType = 'date' | 'string' | 'number' | 'enum';

export interface ChatToolParam {
  name: string;
  type: ChatToolParamType;
  required: boolean;
  description: string;
  /** Для `enum` — допустимые значения. */
  values?: string[];
}

export interface ChatTool {
  name: string;
  description: string;
  params: ChatToolParam[];
  /** Куда ведёт ссылка в ответе (§13.1 п. 3). */
  link: string;
}

const PERIOD_PARAMS: ChatToolParam[] = [
  {
    name: 'fromDate',
    type: 'date',
    required: true,
    description: 'Начало периода, ГГГГ-ММ-ДД.',
  },
  {
    name: 'toDate',
    type: 'date',
    required: true,
    description: 'Конец периода, ГГГГ-ММ-ДД.',
  },
];

/**
 * Полный перечень того, что модель может попросить.
 *
 * Список закрытый. Инструмента «выполни произвольный запрос» здесь нет и
 * быть не должно: он свёл бы на нет весь смысл — модель снова получила бы
 * доступ к данным напрямую.
 */
export const CHAT_TOOLS: ChatTool[] = [
  {
    name: 'get_profit_loss',
    description:
      'Доходы и расходы по статьям за период. Отвечает на вопросы вида ' +
      '«сколько потратили на рекламу», «какая прибыль за квартал».',
    params: PERIOD_PARAMS,
    link: '/financial-reports/profit-loss-sheet',
  },
  {
    name: 'get_cash_flow',
    description:
      'Движение денег за период: сколько пришло, сколько ушло, остаток.',
    params: PERIOD_PARAMS,
    link: '/financial-reports/cashflow-statement',
  },
  {
    name: 'get_balance_sheet',
    description: 'Баланс на дату: имущество и долги.',
    params: [
      {
        name: 'toDate',
        type: 'date',
        required: true,
        description: 'Дата, на которую нужен баланс, ГГГГ-ММ-ДД.',
      },
    ],
    link: '/financial-reports/balance-sheet',
  },
  {
    name: 'get_cash_gaps',
    description:
      'Прогноз кассовых разрывов: когда денег не хватит и на сколько.',
    params: PERIOD_PARAMS,
    link: '/payment-calendar',
  },
  {
    name: 'get_deals_margin',
    description:
      'Прибыльность направлений и проектов за период. Отвечает на вопрос ' +
      '«какой проект самый прибыльный».',
    params: PERIOD_PARAMS,
    link: '/deals',
  },
  {
    name: 'get_expenses_analysis',
    description:
      'Постоянные и переменные расходы, точка безубыточности, запас прочности.',
    params: PERIOD_PARAMS,
    link: '/expenses-analysis',
  },
];

const BY_NAME = new Map(CHAT_TOOLS.map((tool) => [tool.name, tool]));

export function findTool(name: string): ChatTool | null {
  return BY_NAME.get(String(name ?? '')) ?? null;
}
