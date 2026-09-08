// @ts-nocheck
import React from 'react';
import * as R from 'ramda';
import {
  TransactionsLockingList,
  TransactionsLockingFull,
  TransactionLockingSkeletonList,
} from './components';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { withAlertActions } from '@/containers/Alert/withAlertActions';

import { useTransactionsLockingContext } from './TransactionsLockingProvider';

/**
 * Transactions locking body.
 * @returns {JSX}
 */
function TransactionsLockingBodyJsx({
  // #withDialogActions
  openDialog,

  // #withAlertActions
  openAlert,
}) {
  const { isTransactionLockingLoading, transactionLockingType } =
    useTransactionsLockingContext();

  // Handle locking transactions.
  const handleLockingTransactions = (module, { }, isEnabled) => {
    openDialog('locking-transactions', {
      isEnabled: isEnabled,
      module: module,
    });
  };
  // Handle unlocking transactions
  const handleUnlockTransactions = (module) => {
    openDialog('unlocking-transactions', { module: module });
  };
  // Handle unlocking transactions
  const handleUnlockingPartial = (module) => {
    openDialog('unlocking-partial-transactions', { module: module });
  };
  // Handle cancel partial unlocking.
  const handleCancelUnlockingPartail = (module) => {
    openAlert('cancel-unlocking-partail', { module: module });
  };

  return !isTransactionLockingLoading ? (
    transactionLockingType === 'partial' ? (
      <TransactionsLockingList
        onLock={handleLockingTransactions}
        onEditLock={handleLockingTransactions}
        onCancelLock={handleUnlockTransactions}
        onUnlockPartial={handleUnlockingPartial}
        onCancelUnlockPartial={handleCancelUnlockingPartail}
      />
    ) : (
      <TransactionsLockingFull
        onLock={handleLockingTransactions}
        onCancelLock={handleUnlockTransactions}
        onUnlockPartial={handleUnlockingPartial}
        onCancelUnlockPartial={handleCancelUnlockingPartail}
      />
    )
  ) : (
    <TransactionLockingSkeletonList />
  );
}

/**
 * Тип указан явно. `R.compose` из двух и более обёрток теряет знание о том, что
 * на выходе компонент, и место применения получает «ничто» — отсюда «нельзя
 * использовать как компонент». Обёртки сами подставляют всё, что нужно, поэтому
 * снаружи компонент вызывается без свойств (Д9 карты v75).
 */
export const TransactionsLockingBody: React.FC = R.compose(
  withAlertActions,
  withDialogActions,
)(TransactionsLockingBodyJsx);
