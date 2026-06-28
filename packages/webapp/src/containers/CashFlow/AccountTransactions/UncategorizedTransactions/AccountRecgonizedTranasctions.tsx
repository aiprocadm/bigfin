import React from 'react';
import { RecognizedTransactionsTableBoot } from '../RecognizedTransactions/RecognizedTransactionsTableBoot';
// D-redesign слайс 4c: рендер на новом примитиве data-table.tsx.
// Откат — вернуть импорт и тег легаси `RecognizedTransactionsTable` из '../RecognizedTransactions/RecognizedTransactionsTable'.
import { RecognizedTransactionsDataTableV2 } from '../RecognizedTransactions/v2/RecognizedTransactionsDataTableV2';
import { AccountTransactionsCard } from './AccountTransactionsCard';

export function AccountRecognizedTransactions() {
  return (
    <RecognizedTransactionsTableBoot>
      <AccountTransactionsCard>
        <RecognizedTransactionsDataTableV2 />
      </AccountTransactionsCard>
    </RecognizedTransactionsTableBoot>
  );
}
