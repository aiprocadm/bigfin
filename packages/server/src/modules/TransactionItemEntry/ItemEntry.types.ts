/**
 * Виды операций, чьи строки попадают на склад.
 *
 * ДОБАВЛЕНЫ 'CreditNote' и 'VendorCredit': оба вида давно записывают складские
 * движения (`CreditNotesInventoryTransactions`, `VendorCreditInventoryTransactions`),
 * но в перечне их не было — он просто отстал от кода. Пока файлы стояли вне
 * проверки типов, расхождение никак себя не проявляло; стоило бы кому-нибудь
 * написать разбор по этому перечню, и две трети возвратов прошли бы мимо.
 */
export type IItemEntryTransactionType =
  | 'SaleInvoice'
  | 'Bill'
  | 'SaleReceipt'
  | 'CreditNote'
  | 'VendorCredit';

export interface IItemEntryDTO {
  id?: number;
  index?: number;
  itemId: number;
  landedCost?: boolean;
  warehouseId?: number;

  sellAccountId?: number;
  costAccountId?: number; 

  projectRefId?: number;
  projectRefType?: ProjectLinkRefType;
  projectRefInvoicedAmount?: number;

  taxRateId?: number;
  taxCode?: string;
}

export enum ProjectLinkRefType {
  Task = 'TASK',
  Bill = 'BILL',
  Expense = 'EXPENSE',
}
