// © 2026 Bigfin
import {
  MatchableRow,
  MatchableRule,
  normalizeComparator,
  ruleMatches,
} from './matchRule';

/**
 * Конфликт автоправил (FT-035 ТЗ-3) — ДО сохранения, а не постфактум, как
 * у конкурента («исполнено будет первое в списке»).
 *
 * Все типы правил ставят операции статью — значит, любые два правила,
 * подходящие к одной строке, спорят за одно поле, и победит верхнее.
 * Пересечение считаем по НАСТОЯЩИМ строкам выписки: «оба правила подходят
 * к 12 последним операциям» понятнее любой логики условий. Правило с теми
 * же условиями — конфликт, даже если подходящих строк пока нет.
 */

export interface ConflictRule extends MatchableRule {
  id?: number;
  name?: string;
}

export interface RuleConflict {
  ruleId: number;
  ruleName: string;
  /** Сколько строк подходит под оба правила. */
  overlap: number;
  /** Условия и охват совпадают полностью. */
  sameConditions: boolean;
  /** Кто сработает на общих строках. */
  winner: 'existing' | 'new';
  samples: MatchableRow[];
}

const conditionKey = (rule: MatchableRule) =>
  JSON.stringify({
    account: rule.applyIfAccountId ?? null,
    direction: rule.applyIfTransactionType || null,
    mode: rule.conditionsType === 'or' ? 'or' : 'and',
    conditions: (rule.conditions ?? [])
      .map((c) => [c.field, normalizeComparator(c.comparator), String(c.value ?? '').trim().toLowerCase()])
      .map((parts) => parts.join('|'))
      .sort(),
  });

export function findRuleConflicts(
  candidate: ConflictRule,
  existing: ConflictRule[],
  rows: MatchableRow[],
  options: { sampleSize?: number } = {},
): RuleConflict[] {
  const sampleSize = options.sampleSize ?? 3;
  // Кандидат проверяется «как будто включён»: пауза нового правила не
  // отменяет спора, который начнётся, когда его включат.
  const active = { ...candidate, pausedAt: null };
  const candidateRows = rows.filter((row) => ruleMatches(active, row));
  const candidateKey = conditionKey(candidate);
  const candidateOrder = Number(candidate.order ?? 0);

  return existing
    .filter((rule) => rule.id !== candidate.id && !rule.pausedAt)
    .map((rule) => {
      const shared = candidateRows.filter((row) => ruleMatches(rule, row));
      const sameConditions = conditionKey(rule) === candidateKey;
      const ruleOrder = Number(rule.order ?? 0);
      // Меньший порядок — выше; при равном побеждает созданное раньше, то
      // есть существующее (у нового номер больше или его ещё нет).
      const winner: RuleConflict['winner'] =
        candidateOrder < ruleOrder ||
        (candidateOrder === ruleOrder && candidate.id != null && Number(candidate.id) < Number(rule.id))
          ? 'new'
          : 'existing';
      return {
        ruleId: Number(rule.id),
        ruleName: rule.name ?? '',
        overlap: shared.length,
        sameConditions,
        winner,
        samples: shared.slice(0, sampleSize),
      };
    })
    .filter((conflict) => conflict.overlap > 0 || conflict.sameConditions)
    .sort((a, b) => b.overlap - a.overlap);
}
