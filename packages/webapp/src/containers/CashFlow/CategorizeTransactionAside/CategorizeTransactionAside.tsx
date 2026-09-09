import intl from 'react-intl-universal';
import * as R from 'ramda';
import { Aside } from '@/components/Aside/Aside';
import { CategorizeTransactionTabs } from './CategorizeTransactionTabs';
import {
  WithBankingActionsProps,
  withBankingActions,
} from '../withBankingActions';
import { CategorizeTransactionTabsBoot } from './CategorizeTransactionTabsBoot';
import { withBanking } from '../withBanking';
import { useEffect } from 'react';

/**
 * Что приходит из надстройки банка. Имя `selectedUncategorizedTransactionId`
 * — не из хранилища: сборка внизу файла подставляет под него список
 * выбранных операций.
 */
interface CategorizeTransactionAsideProps extends WithBankingActionsProps {
  /**
   * Список выбранных операций. Имя обманчиво: сборка внизу файла подставляет
   * под него `transactionsToCategorizeIdsSelected` — то есть не «номер одной
   * неразобранной», а список выбранных (Д19 карты v82).
   */
  selectedUncategorizedTransactionId?: number[];
}

function CategorizeTransactionAsideRoot({
  // #withBankingActions
  closeMatchingTransactionAside,
  closeReconcileMatchingTransaction,

  // #withBanking
  selectedUncategorizedTransactionId,
  resetTransactionsToCategorizeSelected,
  enableMultipleCategorization,
}: CategorizeTransactionAsideProps) {
  //
  useEffect(
    () => () => {
      // Close the reconcile matching form.
      closeReconcileMatchingTransaction();

      // Reset the selected transactions to categorize.
      resetTransactionsToCategorizeSelected();

      // Disable multi matching.
      enableMultipleCategorization(false);
    },
    [
      closeReconcileMatchingTransaction,
      resetTransactionsToCategorizeSelected,
      enableMultipleCategorization,
    ],
  );

  const handleClose = () => {
    closeMatchingTransactionAside();
  }
  // Cannot continue if there is no selected transactions.;
  if (!selectedUncategorizedTransactionId) {
    return null;
  }
  return (
    <Aside title={intl.get('cashflow.aside.categorize_transaction')} onClose={handleClose}>
      <Aside.Body>
        <CategorizeTransactionTabsBoot
          uncategorizedTransactionId={selectedUncategorizedTransactionId}
        >
          <CategorizeTransactionTabs />
        </CategorizeTransactionTabsBoot>
      </Aside.Body>
    </Aside>
  );
}

export const CategorizeTransactionAside = R.compose(
  withBankingActions,
  withBanking(({ transactionsToCategorizeIdsSelected }) => ({
    selectedUncategorizedTransactionId: transactionsToCategorizeIdsSelected,
  })),
)(CategorizeTransactionAsideRoot);
