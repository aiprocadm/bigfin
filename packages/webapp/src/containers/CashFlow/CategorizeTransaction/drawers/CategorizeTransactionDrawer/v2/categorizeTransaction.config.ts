export interface SubtypeFieldConfig {
  /** intl-ключ подписи счёта списания (debit). */
  debitAccountLabelKey: string;
  /** intl-ключ подписи счёта зачисления (credit). */
  creditAccountLabelKey: string;
  /** Фильтр счёта зачисления по корневому типу. */
  creditFilterRootTypes: string[];
}

/** Карта по transactionType. Переносит различия 6 легаси-компонентов 1:1. */
export const SUBTYPE_FIELD_CONFIG: Record<string, SubtypeFieldConfig> = {
  other_income: {
    debitAccountLabelKey: 'cashflow.label.to_account',
    creditAccountLabelKey: 'cashflow.label.income_account',
    creditFilterRootTypes: ['income'],
  },
  owner_contribution: {
    debitAccountLabelKey: 'cashflow.label.from_account',
    creditAccountLabelKey: 'cashflow.label.equity_account',
    creditFilterRootTypes: ['equity'],
  },
  transfer_from_account: {
    debitAccountLabelKey: 'cashflow.label.from_account',
    creditAccountLabelKey: 'cashflow.label.to_account',
    creditFilterRootTypes: ['asset'],
  },
  other_expense: {
    debitAccountLabelKey: 'payment_account',
    creditAccountLabelKey: 'expense_account',
    creditFilterRootTypes: ['expense'],
  },
  owner_drawing: {
    debitAccountLabelKey: 'cashflow.label.debit_account',
    creditAccountLabelKey: 'cashflow.label.equity_account',
    creditFilterRootTypes: ['equity'],
  },
  transfer_to_account: {
    debitAccountLabelKey: 'cashflow.label.from_account',
    creditAccountLabelKey: 'cashflow.label.to_account',
    creditFilterRootTypes: ['asset'],
  },
};

export const resolveSubtypeConfig = (
  transactionType: string,
): SubtypeFieldConfig | null => SUBTYPE_FIELD_CONFIG[transactionType] ?? null;
