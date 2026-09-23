import { TenantJobPayload } from "@/interfaces/Tenant";

export interface RevertRecognizedTransactionsCriteria {
  batch?: string;
  accountId?: number;
}

export interface RecognizeTransactionsCriteria {
  batch?: string;
  accountId?: number;
}

export const RecognizeUncategorizedTransactionsJob =
  'recognize-uncategorized-transactions-job';
export const RecognizeUncategorizedTransactionsQueue =
  'recognize-uncategorized-transactions-queue';

/** «Применить к прошлым операциям» (FT-034 ТЗ-3) — в той же очереди. */
export const ApplyBankRuleToPastJob = 'apply-bank-rule-to-past-job';

export interface ApplyBankRuleToPastJobPayload extends TenantJobPayload {
  ruleId: number;
  /** Строки, отмеченные в предпросмотре. */
  ids: number[];
}

export interface RecognizeUncategorizedTransactionsJobPayload extends TenantJobPayload {
  ruleId: number,
  transactionsCriteria?: RecognizeTransactionsCriteria;
  /**
   * When true, first reverts recognized transactions before recognizing again.
   * Used when a bank rule is edited to ensure transactions previously recognized
   * by lower-priority rules are re-evaluated against the updated rule.
   */
  shouldRevert?: boolean;
  /**
   * Сразу разносить распознанные строки (FT-030 ТЗ-3). Включается только
   * для новых строк выписки — см. `RecognizeTranasctionsService`.
   */
  apply?: boolean;
}