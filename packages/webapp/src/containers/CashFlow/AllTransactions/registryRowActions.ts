// © 2026 Bigfin
/**
 * Меню операции в реестре (FT-022 ТЗ-3): девять действий. AC: каждый пункт
 * либо выполняет действие, либо объясняет, почему недоступен. Логика без
 * React — её держат тесты.
 *
 * Сервер проверяет всё сам и тоже отказывает словами (например, «перевод
 * возможен только между счетами одной валюты»). Здесь — только то, что
 * видно по строке заранее: не предлагать человеку заведомо невозможное.
 */

export const REGISTRY_ROW_ACTIONS = [
  'create_rule',
  'link_deal',
  'make_recurring',
  'convert_transfer',
  'split',
  'clone',
  'history',
  'tag',
  'delete',
] as const;

export type RegistryRowAction = (typeof REGISTRY_ROW_ACTIONS)[number];

export interface RegistryRowActionState {
  id: RegistryRowAction;
  available: boolean;
  /** Ключ перевода с объяснением, почему пункт недоступен. */
  reasonKey?: string;
}

const CASHFLOW = 'CashflowTransaction';

export function registryRowActions(
  row: { reference_type?: string; referenceType?: string },
  options: { projectsEnabled: boolean },
): RegistryRowActionState[] {
  const referenceType = row.reference_type ?? row.referenceType ?? '';
  const isCashflow = referenceType === CASHFLOW;
  // Операции других разделов (оплата счёта, расход, проводка) живут в
  // своём документе — там их и правят, иначе документ и реестр разойдутся.
  const inDocument = 'all_transactions.actions.reason.in_document';

  const state = (id: RegistryRowAction, available: boolean, reasonKey?: string): RegistryRowActionState =>
    available ? { id, available } : { id, available, reasonKey };

  return [
    state('create_rule', true),
    !options.projectsEnabled
      ? state('link_deal', false, 'all_transactions.actions.reason.deals_off')
      : state('link_deal', isCashflow, inDocument),
    state('make_recurring', true),
    state('convert_transfer', isCashflow, inDocument),
    state('split', isCashflow, inDocument),
    state('clone', isCashflow, inDocument),
    state('history', true),
    state('tag', true),
    state('delete', isCashflow, inDocument),
  ];
}

/**
 * Черновик автоправила из строки (FT-022): счёт, направление денег и
 * условие «назначение содержит …». Статью человек выбирает сам — её правило
 * и должно ставить.
 */
export function ruleDraftFromRow(row: any): Record<string, unknown> {
  const note = String(row.note ?? '').trim();
  const contact = String(row.contact_name ?? row.contactName ?? '').trim();
  const isDeposit = Number(row.deposit) > 0;
  const words = note.split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
  return {
    name: (contact || words || '').slice(0, 60),
    applyIfAccountId: row.account_id ?? row.accountId ?? '',
    applyIfTransactionType: isDeposit ? 'deposit' : 'withdrawal',
    conditions: [
      contact
        ? { field: 'payee', comparator: 'contains', value: contact }
        : { field: 'description', comparator: 'contains', value: words },
    ],
  };
}

/**
 * Черновик повторяющейся плановой операции (FT-022): та же сумма, тот же
 * счёт и контрагент, первый раз — через месяц, повтор ежемесячный.
 */
export function recurringDraftFromRow(row: any, nextDate: string) {
  const isDeposit = Number(row.deposit) > 0;
  return {
    direction: isDeposit ? ('inflow' as const) : ('outflow' as const),
    amount: Number(isDeposit ? row.deposit : row.withdrawal) || 0,
    plannedDate: nextDate,
    accountId: row.account_id ?? row.accountId ?? null,
    contactId: row.contact_id ?? row.contactId ?? null,
    description: String(row.note ?? ''),
    recurrence: { frequency: 'monthly', interval: 1 },
  };
}

const OUT_TYPES = ['other_expense', 'owner_drawing', 'transfer_to_account'];

/** Вид операции в написании формы: `OtherExpense` → `other_expense`. */
export const snakeType = (type: unknown): string =>
  String(type ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();

/**
 * «Клонировать» (FT-022): какое окно открыть и что в него подставить.
 * Дата и номер — новые: копия — это другая операция, а не та же ещё раз.
 */
export function clonePrefill(transaction: any): {
  dialog: 'money-in' | 'money-out';
  accountId: number | null;
  accountName: string;
  prefill: Record<string, unknown>;
} {
  const type = snakeType(transaction?.transaction_type ?? transaction?.transactionType);
  return {
    dialog: OUT_TYPES.includes(type) ? 'money-out' : 'money-in',
    accountId: transaction?.cashflow_account_id ?? transaction?.cashflowAccountId ?? null,
    accountName: transaction?.cashflow_account?.name ?? transaction?.cashflowAccount?.name ?? '',
    prefill: {
      amount: String(Math.abs(Number(transaction?.amount ?? 0)) || ''),
      transaction_type: type,
      credit_account_id: transaction?.credit_account_id ?? transaction?.creditAccountId ?? null,
      description: String(transaction?.description ?? ''),
    },
  };
}

