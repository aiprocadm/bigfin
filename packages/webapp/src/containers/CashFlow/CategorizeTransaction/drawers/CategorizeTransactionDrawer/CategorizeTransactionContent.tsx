import { Suspense } from 'react';
import type React from 'react';
import { compose } from '@/utils';
import styled from 'styled-components';
import { Spinner } from '@blueprintjs/core';
import { CategorizeTransactionBoot } from './CategorizeTransactionBoot';
import { CategorizeTransactionForm } from './CategorizeTransactionForm';
import { withBanking } from '@/containers/CashFlow/withBanking';

function CategorizeTransactionContentRoot({
  transactionsToCategorizeIdsSelected,
}: any) {
  return (
    <CategorizeTransactionBoot
      uncategorizedTransactionsIds={transactionsToCategorizeIdsSelected}
    >
      <CategorizeTransactionDrawerBody>
        <Suspense fallback={<Spinner size={40} />}>
          <CategorizeTransactionForm />
        </Suspense>
      </CategorizeTransactionDrawerBody>
    </CategorizeTransactionBoot>
  );
}

/**
 * Что окно передаёт содержимому. Вид объявлен здесь, потому что сборка отдаёт
 * «что угодно», а отложенная загрузка из «что угодно» делает экран, не
 * принимающий свойств вовсе (Д4 карты v84).
 */
export const CategorizeTransactionContent: React.ComponentType<{
  uncategorizedTransactionId?: number | null;
}> = compose(
  withBanking(({ transactionsToCategorizeIdsSelected }: any) => ({
    transactionsToCategorizeIdsSelected,
  })),
)(CategorizeTransactionContentRoot);

const CategorizeTransactionDrawerBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
`;
