import React, { Suspense } from 'react';
import * as R from 'ramda';
import { Spinner } from '@/components/ui/Spinner';
import { CategorizeTransactionBoot } from '../CategorizeTransactionBoot';
import { withBanking } from '@/containers/CashFlow/withBanking';
import { CategorizeTransactionFormV2 } from './CategorizeTransactionFormV2';

function CategorizeTransactionContentV2Root({
  transactionsToCategorizeIdsSelected,
}: any) {
  return (
    <CategorizeTransactionBoot
      uncategorizedTransactionsIds={transactionsToCategorizeIdsSelected}
    >
      <div className="flex flex-1 flex-col">
        <Suspense fallback={<Spinner size="md" />}>
          <CategorizeTransactionFormV2 />
        </Suspense>
      </div>
    </CategorizeTransactionBoot>
  );
}

export const CategorizeTransactionContentV2 = R.compose(
  withBanking(({ transactionsToCategorizeIdsSelected }: any) => ({
    transactionsToCategorizeIdsSelected,
  })),
)(CategorizeTransactionContentV2Root);
