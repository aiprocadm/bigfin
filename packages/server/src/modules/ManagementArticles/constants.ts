// eslint-disable-next-line import/prefer-default-export
export const ERRORS = {
  ARTICLE_NAME_EXISTS: 'ARTICLE_NAME_EXISTS',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  PARENT_ARTICLE_NOT_FOUND: 'PARENT_ARTICLE_NOT_FOUND',
  ARTICLE_HAS_CHILDREN: 'ARTICLE_HAS_CHILDREN',
  ARTICLE_IN_USE: 'ARTICLE_IN_USE',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  ACCOUNT_ALREADY_MAPPED: 'ACCOUNT_ALREADY_MAPPED',
  ACCOUNT_KIND_MISMATCH: 'ACCOUNT_KIND_MISMATCH',
  ARTICLE_KIND_PARENT_MISMATCH: 'ARTICLE_KIND_PARENT_MISMATCH',
  ARTICLE_KIND_CHILDREN_MISMATCH: 'ARTICLE_KIND_CHILDREN_MISMATCH',
  ARTICLE_PARENT_CYCLE: 'ARTICLE_PARENT_CYCLE',
  INVALID_ARTICLE_KIND: 'INVALID_ARTICLE_KIND',
  COST_BEHAVIOR_ONLY_FOR_EXPENSE: 'COST_BEHAVIOR_ONLY_FOR_EXPENSE',
  CASHFLOW_SECTION_REQUIRED: 'CASHFLOW_SECTION_REQUIRED',
  // FT-009 ТЗ-3: ярус управленческого ОПиУ.
  ARTICLE_PL_TYPE_UNKNOWN: 'ARTICLE_PL_TYPE_UNKNOWN',
  ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND: 'ARTICLE_PL_TYPE_NOT_ALLOWED_FOR_KIND',
};

/**
 * Пять видов статьи учёта (FIN-001 ТЗ-2).
 *
 * ЗАЧЕМ ПЯТЬ, А НЕ ДВА. Движение денег, которое не является ни доходом, ни
 * расходом, статьёй не классифицировалось вовсе: получение займа, покупка
 * оборудования, возврат аванса, взнос учредителя. Человек, размечающий
 * выписку, упирался в операции, для которых «нет подходящей статьи», и либо
 * ставил неверную — и тогда тело кредита искажало прибыль, — либо бросал
 * разноску.
 *
 * Это УТОЧНЕНИЕ существующей модели, а не новая сущность: связь
 * `management_article_accounts` остаётся и продолжает делать вид статьи
 * фактом, а не декларацией.
 */
export const ARTICLE_KINDS = [
  'income',
  'expense',
  'asset',
  'liability',
  'equity',
] as const;

/**
 * Виды, которые участвуют в отчёте о прибылях и убытках.
 *
 * ГЛАВНОЕ ПРАВИЛО ЭТАПА 17. Балансовые виды в ОПиУ не входят НИ ПРИ КАКОМ
 * методе учёта. Взнос учредителя — не выручка, покупка станка — не расход,
 * погашение кредита — не убыток. Попади они в свёртку по статьям, поехали бы
 * сразу пять расчётов, которые её зовут: точка безубыточности,
 * рентабельность сделок, распределение накладных, капитализация и ответы
 * ИИ-аналитика.
 */
export const PL_ARTICLE_KINDS = ['income', 'expense'] as const;

/**
 * Балансовые виды: в ОПиУ их нет, в ДДС по статьям они есть и
 * распределяются по разделу движения денег (FIN-013).
 */
export const BALANCE_ARTICLE_KINDS = ['asset', 'liability', 'equity'] as const;
export const CASHFLOW_SECTIONS = [
  'operating',
  'investing',
  'financing',
] as const;

/**
 * Служебный раздел «Корректировки остатка» (FT-071 ТЗ-3). Его ставит только
 * служебная статья фиксации остатка; в форму статьи он не предлагается.
 * Принимать его DTO обязан: иначе переименовать служебную статью было бы
 * нельзя — форма прислала бы её же раздел и получила отказ.
 */
export const SERVICE_CASHFLOW_SECTIONS = ['adjustments'] as const;

/** Всё, что DTO статьи принимает в поле раздела. */
export const ARTICLE_CASHFLOW_SECTIONS = [
  ...CASHFLOW_SECTIONS,
  ...SERVICE_CASHFLOW_SECTIONS,
] as const;

/**
 * Поведение расхода: постоянный не зависит от объёма продаж (аренда,
 * оклады), переменный растёт вместе с выручкой (закупка товара, сдельная
 * оплата, комиссии). Нужно точке безубыточности (этап 9 ТЗ).
 */
export const COST_BEHAVIORS = ['fixed', 'variable'] as const;
