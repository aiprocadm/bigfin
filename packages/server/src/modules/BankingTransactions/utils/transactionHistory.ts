// © 2026 Bigfin

/**
 * История изменений операции (FT-026 ТЗ-3): «кто, когда, что изменил».
 *
 * Два источника в одной ленте: журнал действий (человек и службы продукта)
 * и след автоправил (что поставило правило). Свежее — сверху. Одинаковое
 * время не теряет записей: у каждой свой ключ.
 */
export interface TransactionHistoryItem {
  key: string;
  at: string;
  /** user — действие человека или продукта, rule — автоправило. */
  source: 'user' | 'rule';
  action: string;
  /** Кто: имя человека или название правила; пусто — неизвестно. */
  actor: string | null;
  details: Record<string, unknown>;
}

const parseChanges = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'object') return value as Record<string, unknown>;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
};

const userName = (user: any): string | null => {
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email || null;
};

export function buildTransactionHistory(auditRows: any[], ruleRows: any[]): TransactionHistoryItem[] {
  const items: TransactionHistoryItem[] = [
    ...auditRows.map((row) => ({
      key: `audit:${row.id}`,
      at: String(row.createdAt),
      source: 'user' as const,
      action: String(row.action),
      actor: userName(row.tenantUser),
      details: (row.metadata as Record<string, unknown>) ?? {},
    })),
    ...ruleRows.map((row) => {
      const changes = parseChanges(row.changes);
      return {
        key: `rule:${row.id}`,
        at: String(row.appliedAt),
        source: 'rule' as const,
        action: 'rule_applied',
        // Правило могли удалить — след остаётся с названием из следа.
        actor: (row.ruleName as string) ?? (changes.ruleName as string) ?? null,
        details: changes,
      };
    }),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.key < b.key ? 1 : -1));
}
