import React from 'react';
import { AccountTransactionsCard } from '../UncategorizedTransactions/AccountTransactionsCard';
import { PendingTransactionsBoot } from './PendingTransactionsTableBoot';
// D-redesign слайс 4a: рендер на новом примитиве data-table.tsx.
// Откат — вернуть импорт и тег легаси `PendingTransactionsDataTable` из './PendingTransactionsTable'.
import { PendingTransactionsDataTableV2 } from './v2/PendingTransactionsDataTableV2';

export function PendingTransactions() {
  return (
    <PendingTransactionsBoot>
      <AccountTransactionsCard>
        <PendingTransactionsDataTableV2 />
      </AccountTransactionsCard>
    </PendingTransactionsBoot>
  );
}
