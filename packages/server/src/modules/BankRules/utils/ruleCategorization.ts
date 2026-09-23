// © 2026 Bigfin
import { splitByShares } from './splitShares';

/**
 * Как разнести строку выписки по автоправилу (FT-030…FT-032 ТЗ-3) — план
 * без базы. Служба применения только исполняет его, поэтому всё, что тут
 * может пойти не так, проверяется тестом, а не на живых деньгах.
 */

/** Виды операции поступления и списания — как их шлёт экран разноски. */
const IN_TYPES = ['owner_contribution', 'other_income', 'transfer_from_account'];
const OUT_TYPES = ['owner_drawing', 'other_expense', 'transfer_to_account'];
const TRANSFER_TYPES = ['transfer_from_account', 'transfer_to_account'];

/** «OtherIncome» и «other_income» — одно и то же: в базе лежат оба. */
export const snakeType = (value: unknown): string =>
  String(value ?? '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();

export interface PlanRule {
  ruleType?: string | null;
  assignCategory?: string | null;
  assignAccountId?: number | null;
  assignContactId?: number | null;
  assignProjectId?: number | null;
  transferToAccountId?: number | null;
  splits?: Array<{
    sharePercent: number | string;
    articleId: number | null;
    projectId?: number | null;
    contactId?: number | null;
    sortOrder?: number;
  }>;
}

export interface PlanRow {
  amount: number;
}

export interface RuleCategorizationPlan {
  transactionType: string;
  creditAccountId: number;
  contactId: number | null;
  projectId: number | null;
  /** Части для правила «Разбить»: суммы по модулю, сходятся с операцией. */
  splits: Array<{ amount: number; articleId: number; projectId: number | null }>;
}

export type RuleSkipReason =
  | 'zero_amount'
  | 'no_account'
  | 'split_article_without_account'
  | 'unsupported_rule_type';

export function planRuleCategorization(
  rule: PlanRule,
  row: PlanRow,
  /** Счёт статьи: статья → счёт для проводки. */
  articleAccountOf: Map<number, number>,
): RuleCategorizationPlan | { skip: RuleSkipReason } {
  const amount = Number(row.amount);
  if (!amount) return { skip: 'zero_amount' };
  const incoming = amount > 0;
  const plain = incoming ? 'other_income' : 'other_expense';
  const ruleType = rule.ruleType ?? 'assign';

  if (ruleType === 'transfer') {
    if (!rule.transferToAccountId) return { skip: 'no_account' };
    return {
      transactionType: incoming ? 'transfer_from_account' : 'transfer_to_account',
      creditAccountId: Number(rule.transferToAccountId),
      // Перевод между своими счетами: ни контрагента, ни направления.
      contactId: null,
      projectId: null,
      splits: [],
    };
  }

  if (ruleType === 'split') {
    const lines = [...(rule.splits ?? [])].sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    );
    if (lines.some((line) => !articleAccountOf.has(Number(line.articleId)))) {
      return { skip: 'split_article_without_account' };
    }
    const parts = splitByShares(amount, lines.map((line) => Number(line.sharePercent)));
    return {
      transactionType: plain,
      // Счёт первой части — у операции он один; проводки пойдут по частям.
      creditAccountId: articleAccountOf.get(Number(lines[0].articleId))!,
      contactId: lines[0].contactId ?? null,
      projectId: null,
      splits: lines.map((line, index) => ({
        amount: parts[index],
        articleId: Number(line.articleId),
        projectId: line.projectId ?? null,
      })),
    };
  }

  if (ruleType === 'assign') {
    if (!rule.assignAccountId) return { skip: 'no_account' };
    // Вид операции из правила — только если он того же направления и не
    // перевод: «прочий доход» на списание разноска отвергла бы.
    const wanted = snakeType(rule.assignCategory);
    const allowed = incoming ? IN_TYPES : OUT_TYPES;
    const transactionType =
      allowed.includes(wanted) && !TRANSFER_TYPES.includes(wanted) ? wanted : plain;
    return {
      transactionType,
      creditAccountId: Number(rule.assignAccountId),
      contactId: rule.assignContactId ?? null,
      projectId: rule.assignProjectId ?? null,
      splits: [],
    };
  }

  return { skip: 'unsupported_rule_type' };
}
