import { Classes } from '@blueprintjs/core';
import { RuleFormBoot } from './RuleFormBoot';
import { RuleFormContentForm } from './RuleFormContentForm';

interface RuleFormContentProps {
  dialogName: string;
  bankRuleId?: number;
  /** Предзаполнение нового правила из операции реестра (FT-022 ТЗ-3). */
  prefill?: Record<string, unknown>;
}

export default function RuleFormContent({
  dialogName,
  bankRuleId,
  prefill,
}: RuleFormContentProps) {
  return (
    <RuleFormBoot bankRuleId={bankRuleId} prefill={prefill}>
      <div className={Classes.DIALOG_BODY}>
        <RuleFormContentForm />
      </div>
    </RuleFormBoot>
  );
}
