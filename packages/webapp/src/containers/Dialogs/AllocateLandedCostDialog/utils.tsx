import React from 'react';
import intl from 'react-intl-universal';
import { sumBy, round } from 'lodash';
import * as R from 'ramda';

import { defaultFastFieldShouldUpdate } from '@/utils';
import { MoneyFieldCell } from '@/components';

export const defaultInitialItem = {
  entry_id: '',
  cost: '',
};

// Default form initial values.
export const defaultInitialValues = {
  transaction_type: 'Bill',
  transaction_id: '',
  transaction_entry_id: '',
  amount: '',
  allocation_method: 'quantity',
  items: [defaultInitialItem],
};

/**
 * Retrieve transaction entries of the given transaction id.
 */
export function getEntriesByTransactionId(transactions: any, id: any) {
  const transaction = transactions.find((trans: any) => trans.id === id);
  return transaction ? transaction.entries : [];
}

/**
 *
 * @param {*} transaction
 * @param {*} transactionEntryId
 * @returns
 */
export function getTransactionEntryById(transaction: any, transactionEntryId: any) {
  return transaction.entries.find((entry: any) => entry.id === transactionEntryId);
}

/**
 *
 * @param {*} total
 * @param {*} allocateType
 * @param {*} entries
 * @returns
 */
export function allocateCostToEntries(total: any, allocateType: any, entries: any) {
  return R.compose(
    R.when(
      R.always(allocateType === 'value'),
      R.curry(allocateCostByValue)(total),
    ),
    R.when(
      R.always(allocateType === 'quantity'),
      R.curry(allocateCostByQuantity)(total),
    ),
  )(entries);
}

/**
 * Allocate total cost on entries on value.
 * @param {*} entries
 * @param {*} total
 * @returns
 */
export function allocateCostByValue(total: any, entries: any) {
  const totalAmount = sumBy(entries, 'amount');

  const entriesMapped = entries.map((entry: any) => ({
    ...entry,
    percentageOfValue: entry.amount / totalAmount,
  }));

  return entriesMapped.map((entry: any) => ({
    ...entry,
    cost: round(entry.percentageOfValue * total, 2),
  }));
}

/**
 * Allocate total cost on entries by quantity.
 * @param {*} entries
 * @param {*} total
 * @returns
 */
export function allocateCostByQuantity(total: any, entries: any) {
  const totalQuantity = sumBy(entries, 'quantity');

  const _entries = entries.map((entry: any) => ({
    ...entry,
    percentageOfQuantity: entry.quantity / totalQuantity,
  }));

  return _entries.map((entry: any) => ({
    ...entry,
    cost: round(entry.percentageOfQuantity * total, 2),
  }));
}

/**
 * Retrieve the landed cost transaction by the given id.
 */
export function getCostTransactionById(id: any, transactions: any) {
  return transactions.find((trans: any) => trans.id === id);
}

/**
 * Detarmines the transactions selet field when should update.
 */
export function transactionsSelectShouldUpdate(newProps: any, oldProps: any) {
  return (
    newProps.transactions !== oldProps.transactions ||
    defaultFastFieldShouldUpdate(newProps, oldProps)
  );
}

/**
 *
 * @param {*} entries
 * @returns
 */
export function resetAllocatedCostEntries(entries: any) {
  return entries.map((entry: any) => ({ ...entry, cost: 0 }));
}

/**
 * Retrieves allocate landed cost entries table columns.
 */
export const useAllocateLandedCostEntriesTableColumns = () => {
  return React.useMemo(
    () => [
      {
        Header: intl.get('item'),
        accessor: 'item.name',
        disableSortBy: true,
        width: '150',
      },
      {
        Header: intl.get('quantity'),
        accessor: 'quantity',
        disableSortBy: true,
        width: '100',
      },
      {
        Header: intl.get('rate'),
        accessor: 'rate',
        disableSortBy: true,
        width: '100',
        align: 'right',
      },
      {
        Header: intl.get('amount'),
        accessor: 'amount',
        disableSortBy: true,
        align: 'right',
        width: '100',
      },
      {
        Header: intl.get('cost'),
        accessor: 'cost',
        width: '150',
        Cell: MoneyFieldCell,
        disableSortBy: true,
      },
    ],
    [],
  );
};
