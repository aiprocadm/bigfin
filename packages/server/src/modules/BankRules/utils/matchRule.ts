// © 2026 Bigfin
/**
 * Подходит ли строка выписки под автоправило (FT-030 ТЗ-3).
 *
 * Здесь только логика, без базы: одна и та же функция решает и при импорте
 * выписки, и в предпросмотре «применить к прошлым», и в тестах. Если бы
 * у предпросмотра была своя копия условий, он показывал бы одни операции,
 * а применялись бы другие.
 *
 * ЧТО ИСПРАВЛЕНО ПО СРАВНЕНИЮ С ПРЕЖНИМ СОПОСТАВЛЕНИЕМ:
 * - правило без счёта («для любого счёта») раньше не срабатывало НИКОГДА:
 *   его собирали в отдельную кучу и забывали передать дальше;
 * - правило без типа операции («оба») тоже не срабатывало;
 * - «содержит» сравнивало без учёта регистра, а «не содержит» — с учётом,
 *   так что «не содержит ozon» пропускало «OZON». Теперь весь текст
 *   сравнивается одинаково: без регистра, «ё» как «е», пробелы схлопнуты.
 */

export const RULE_CONDITION_FIELDS = ['description', 'payee', 'amount'] as const;
export type RuleConditionField = (typeof RULE_CONDITION_FIELDS)[number];

export const RULE_COMPARATORS = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'in_list',
  'bigger',
  'bigger_or_equal',
  'smaller',
  'smaller_or_equal',
] as const;
export type RuleComparator = (typeof RULE_COMPARATORS)[number];

/** Старые написания, которые уже могли лежать в базе или прийти с экрана. */
const COMPARATOR_ALIASES: Record<string, RuleComparator> = {
  equal: 'equals',
  not_contain: 'not_contains',
};

export const normalizeComparator = (value: string): RuleComparator | string =>
  COMPARATOR_ALIASES[value] ?? value;

/** Не больше стольких условий в одном правиле (FT-030). */
export const MAX_RULE_CONDITIONS = 50;

export interface RuleCondition {
  field: string;
  comparator: string;
  value: string | number | null;
}

export interface MatchableRule {
  id?: number;
  order?: number | null;
  applyIfAccountId?: number | null;
  /** `deposit` — поступление, `withdrawal` — списание, пусто — оба. */
  applyIfTransactionType?: string | null;
  conditionsType?: string | null;
  conditions?: RuleCondition[];
  pausedAt?: string | Date | null;
}

export interface MatchableRow {
  accountId: number;
  /** Со знаком: плюс — поступление, минус — списание. */
  amount: number;
  description?: string | null;
  payee?: string | null;
}

const text = (value: unknown): string =>
  String(value ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();

/** «1 000,50» и «1000.5» — одно и то же число. */
export const parseAmount = (value: unknown): number => {
  const cleaned = String(value ?? '')
    .replace(/[\s ]/g, '')
    .replace(',', '.');
  return cleaned === '' ? NaN : Number(cleaned);
};

/** Значения списка: через точку с запятой или с новой строки. */
export const listValues = (value: unknown): string[] =>
  String(value ?? '')
    .split(/[;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const round2 = (value: number) => Math.round(value * 100) / 100;

function matchAmount(amount: number, condition: RuleCondition): boolean {
  const actual = round2(Math.abs(amount));
  if (condition.comparator === 'in_list') {
    return listValues(condition.value).some(
      (item) => round2(parseAmount(item)) === actual,
    );
  }
  const expected = round2(parseAmount(condition.value));
  if (Number.isNaN(expected)) return false;
  switch (normalizeComparator(condition.comparator)) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'bigger':
      return actual > expected;
    case 'bigger_or_equal':
      return actual >= expected;
    case 'smaller':
      return actual < expected;
    case 'smaller_or_equal':
      return actual <= expected;
    default:
      return false;
  }
}

function matchText(raw: unknown, condition: RuleCondition): boolean {
  const actual = text(raw);
  const expected = text(condition.value);
  switch (normalizeComparator(condition.comparator)) {
    case 'equals':
      return actual === expected;
    case 'not_equals':
      return actual !== expected;
    case 'contains':
      return expected !== '' && actual.includes(expected);
    case 'not_contains':
      return expected === '' || !actual.includes(expected);
    case 'starts_with':
      return expected !== '' && actual.startsWith(expected);
    case 'in_list':
      return listValues(condition.value).some((item) => text(item) === actual);
    default:
      return false;
  }
}

export function conditionMatches(row: MatchableRow, condition: RuleCondition): boolean {
  if (condition.field === 'amount') return matchAmount(row.amount, condition);
  if (condition.field === 'description') return matchText(row.description, condition);
  if (condition.field === 'payee') return matchText(row.payee, condition);
  return false;
}

/** Правило целиком: пауза, счёт, направление движения денег и условия. */
export function ruleMatches(rule: MatchableRule, row: MatchableRow): boolean {
  if (rule.pausedAt) return false;
  if (rule.applyIfAccountId != null && Number(rule.applyIfAccountId) !== Number(row.accountId)) {
    return false;
  }
  if (rule.applyIfTransactionType === 'deposit' && !(row.amount > 0)) return false;
  if (rule.applyIfTransactionType === 'withdrawal' && !(row.amount < 0)) return false;

  const conditions = rule.conditions ?? [];
  // Правило без условий подходило бы ко всему подряд — это не правило.
  if (conditions.length === 0) return false;
  return rule.conditionsType === 'or'
    ? conditions.some((condition) => conditionMatches(row, condition))
    : conditions.every((condition) => conditionMatches(row, condition));
}

/**
 * Первое подходящее правило по порядку (меньший `order` — выше), при равном
 * порядке — созданное раньше. Порядок задан явно: база без сортировки
 * отдаёт строки как ей удобно, и «первое» было бы случайным.
 */
export function findMatchingRule<T extends MatchableRule>(
  rules: T[],
  row: MatchableRow,
): T | undefined {
  return [...rules]
    .sort(
      (a, b) =>
        Number(a.order ?? 0) - Number(b.order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0),
    )
    .find((rule) => ruleMatches(rule, row));
}
