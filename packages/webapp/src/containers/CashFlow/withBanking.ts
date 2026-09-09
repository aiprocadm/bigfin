
import { connect } from 'react-redux';

/**
 * Что надстройка кладёт в свойства экрана.
 *
 * Та же причина, что у `withDashboard` и `withCurrentOrganization` в карте
 * v81: с `mapState: any` экран не знал ни одного из этих имён, и объявление
 * его свойств получалось неполным (Д18 карты v82).
 */
export interface BankingMapped {
  openMatchingTransactionAside: boolean;
  selectedUncategorizedTransactionId: number | null;
  openReconcileMatchingTransaction: boolean;
  reconcileMatchingTransactionPendingAmount: number;
  uncategorizedTransationsIdsSelected: number[];
  excludedTransactionsIdsSelected: number[];
  enableMultipleCategorization: boolean;
  transactionsToCategorizeIdsSelected: number[];
  categorizedTransactionsSelected: number[];
  uncategorizedTransactionsFilter: string;
}

export const withBanking = <TMapped,>(
  mapState?: (mapped: BankingMapped, state: any, props: any) => TMapped,
) => {
  const mapStateToProps = (state: any, props: any) => {
    const mapped: BankingMapped = {
      openMatchingTransactionAside: state.plaid.openMatchingTransactionAside,
      selectedUncategorizedTransactionId:
        state.plaid.uncategorizedTransactionIdForMatching,
      openReconcileMatchingTransaction:
        state.plaid.openReconcileMatchingTransaction.isOpen,

      reconcileMatchingTransactionPendingAmount:
        state.plaid.openReconcileMatchingTransaction.pending,

      uncategorizedTransationsIdsSelected:
        state.plaid.uncategorizedTransactionsSelected,

      excludedTransactionsIdsSelected: state.plaid.excludedTransactionsSelected,
      enableMultipleCategorization: state.plaid.enableMultipleCategorization,

      transactionsToCategorizeIdsSelected:
        state.plaid.transactionsToCategorizeSelected,

      categorizedTransactionsSelected:
        state.plaid.categorizedTransactionsSelected,

      uncategorizedTransactionsFilter: state.plaid.uncategorizedFilter
    };
    return mapState ? mapState(mapped, state, props) : mapped;
  };
  return connect(mapStateToProps);
};
