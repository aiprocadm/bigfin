// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { Badge } from '@/components/ui/badge';
import { DialogsName } from '@/constants/dialogs';
import { useDialogActions } from '@/hooks/state/dashboard';

export interface AutoRuleInfo {
  rule_id?: number;
  ruleId?: number;
  rule_name?: string | null;
  ruleName?: string | null;
}

/**
 * Бейдж «А» (FT-036 ТЗ-3): операцию разнесло автоправило. Нажатие
 * открывает само правило — видно, по какому условию оно сработало.
 * Правило с тех пор удалили — бейдж остаётся, но открывать нечего.
 */
export function AutoRuleBadge({ autoRule }: { autoRule?: AutoRuleInfo | null }) {
  const { openDialog } = useDialogActions();
  if (!autoRule) return null;
  const ruleId = autoRule.rule_id ?? autoRule.ruleId;
  const ruleName = autoRule.rule_name ?? autoRule.ruleName;
  const title = ruleName
    ? intl.get('auto_rule_badge.title', { name: ruleName })
    : intl.get('auto_rule_badge.deleted');

  return (
    <button
      type="button"
      className="mr-2 inline-flex"
      title={title}
      aria-label={title}
      disabled={!ruleName}
      onClick={(event) => {
        // Строка реестра сама открывает операцию — бейдж открывает правило.
        event.stopPropagation();
        if (ruleName && ruleId) openDialog(DialogsName.BankRuleForm, { bankRuleId: ruleId });
      }}
    >
      <Badge variant="secondary">{intl.get('auto_rule_badge.letter')}</Badge>
    </button>
  );
}
