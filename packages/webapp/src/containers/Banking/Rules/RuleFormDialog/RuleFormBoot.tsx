import React, { createContext } from 'react';
import { DialogContent } from '@/components';
import { useBankRule } from '@/hooks/query/bank-rules';
import { useAccounts } from '@/hooks/query';

/**
 * Что загрузчик кладёт в контекст формы правила.
 *
 * Раньше объявление говорило, что правило и его номер — всегда `null`, а
 * счетов в контексте нет вовсе; на деле счета кладутся сюда с первого дня, и
 * форма их читает. Врало объявление, не код (Д6 карты v87).
 */
interface RuleFormBootValues {
  bankRule?: any;
  bankRuleId?: number;
  accounts?: any[];
  isBankRuleLoading: boolean;
  isAccountsLoading: boolean;
  isEditMode: boolean;
  isNewMode: boolean;
  /** Предзаполнение нового правила из операции реестра (FT-022 ТЗ-3). */
  prefill?: Record<string, unknown>;
}

const RuleFormBootContext = createContext<RuleFormBootValues>(
  {} as RuleFormBootValues,
);

interface RuleFormBootProps {
  bankRuleId?: number;
  prefill?: Record<string, unknown>;
  children: React.ReactNode;
}

function RuleFormBoot({ bankRuleId, prefill, ...props }: RuleFormBootProps) {
  const { data: bankRule, isLoading: isBankRuleLoading } = useBankRule(
    bankRuleId as number,
    {
      enabled: !!bankRuleId,
    },
  );
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts({}, {});

  const isNewMode = !bankRuleId;
  const isEditMode = !isNewMode;

  const provider: RuleFormBootValues = {
    bankRuleId,
    bankRule,
    accounts,
    isBankRuleLoading,
    isAccountsLoading,
    isEditMode,
    isNewMode,
    prefill,
  };

  const isLoading = isBankRuleLoading || isAccountsLoading;

  return (
    <DialogContent isLoading={isLoading}>
      <RuleFormBootContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useRuleFormDialogBoot = () =>
  React.useContext<RuleFormBootValues>(RuleFormBootContext);

export { RuleFormBoot, useRuleFormDialogBoot };
