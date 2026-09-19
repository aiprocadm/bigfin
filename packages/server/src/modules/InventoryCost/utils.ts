import { chain } from 'lodash';
import { pick } from 'lodash';
import { IItemEntryTransactionType } from '../TransactionItemEntry/ItemEntry.types';
import { TInventoryTransactionDirection } from './types/InventoryCost.types';
import { ItemEntry } from '../TransactionItemEntry/models/ItemEntry';

/**
 * Grpups by transaction type and id the inventory transactions.
 * @param {IInventoryTransaction} invTransactions
 * @returns
 */
export function groupInventoryTransactionsByTypeId(
  transactions: { transactionType: string; transactionId: number }[],
): { transactionType: string; transactionId: number }[][] {
  return chain(transactions)
    .groupBy((t) => `${t.transactionType}-${t.transactionId}`)
    .values()
    .value();
}

/**
 * Собирает складские движения из строк документа.
 *
 * Вид возврата НЕ объявлен нарочно: раньше здесь стоял `IInventoryTransaction[]`,
 * а такого типа нет нигде в проекте — он только выглядел как договор. Вывод по
 * коду честнее: он не может разойтись с тем, что функция правда собирает.
 */
export function transformItemEntriesToInventory(transaction: {
  transactionId: number;
  transactionType: IItemEntryTransactionType;
  transactionNumber?: string;

  exchangeRate?: number;

  // Склад может быть не указан вовсе (не у всех документов он есть).
  warehouseId?: number | null;

  date: Date | string;
  direction: TInventoryTransactionDirection;
  entries: ItemEntry[];
  createdAt: Date | string;
}) {
  const exchangeRate = transaction.exchangeRate || 1;

  return transaction.entries.map((entry: ItemEntry) => ({
    ...pick(entry, ['itemId', 'quantity']),
    rate: entry.rate * exchangeRate,
    transactionType: transaction.transactionType,
    transactionId: transaction.transactionId,
    direction: transaction.direction,
    date: transaction.date,
    entryId: entry.id,
    createdAt: transaction.createdAt,
    costAccountId: entry.costAccountId,

    warehouseId: entry.warehouseId || transaction.warehouseId,
    meta: {
      transactionNumber: transaction.transactionNumber,
      description: entry.description,
    },
  }));
}
