// © 2026 Bigfin
import { DRAWERS } from '@/constants/drawers';

export interface ReferenceDrawerTarget {
  name: DRAWERS;
  payload: Record<string, number | string>;
}

/**
 * Maps a ledger entry `referenceType` to the existing details drawer and its
 * exact payload key. Payload keys are copied from real `openDrawer` call
 * sites across the app (invoices/bills/expenses tables, cash-flow utils).
 * Returns `null` for unknown types — the row must stay non-clickable then.
 */
export function resolveReferenceDrawer(
  referenceType: string | null | undefined,
  referenceId: number | string | null | undefined,
): ReferenceDrawerTarget | null {
  if (!referenceType || referenceId == null) return null;

  switch (referenceType) {
    case 'SaleInvoice':
      return {
        name: DRAWERS.INVOICE_DETAILS,
        payload: { invoiceId: referenceId },
      };
    case 'Bill':
      return { name: DRAWERS.BILL_DETAILS, payload: { billId: referenceId } };
    case 'Expense':
      return {
        name: DRAWERS.EXPENSE_DETAILS,
        payload: { expenseId: referenceId },
      };
    // Manual journals write GL entries with referenceType 'Journal'
    // (see server ManualJournalGL); keep 'ManualJournal' as an alias.
    case 'Journal':
    case 'ManualJournal':
      return {
        name: DRAWERS.JOURNAL_DETAILS,
        payload: { manualJournalId: referenceId },
      };
    case 'PaymentReceive':
      return {
        name: DRAWERS.PAYMENT_RECEIVED_DETAILS,
        payload: { paymentReceiveId: referenceId },
      };
    case 'BillPayment':
      return {
        name: DRAWERS.PAYMENT_MADE_DETAILS,
        payload: { paymentMadeId: referenceId },
      };
    case 'SaleReceipt':
      return {
        name: DRAWERS.RECEIPT_DETAILS,
        payload: { receiptId: referenceId },
      };
    case 'CreditNote':
      return {
        name: DRAWERS.CREDIT_NOTE_DETAILS,
        payload: { creditNoteId: referenceId },
      };
    case 'VendorCredit':
      return {
        name: DRAWERS.VENDOR_CREDIT_DETAILS,
        payload: { vendorCreditId: referenceId },
      };
    default:
      return null;
  }
}
