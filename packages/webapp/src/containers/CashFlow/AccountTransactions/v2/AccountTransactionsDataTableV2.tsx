import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { DataTable } from '@/components/ui/data-table';
import { AppToaster } from '@/components';
import { compose } from '@/utils';
import { withDrawerActions } from '@/containers/Drawer/withDrawerActions';
import { withBankingActions } from '../../withBankingActions';
import { useUncategorizeTransaction } from '@/hooks/query';
import { useUnmatchMatchedUncategorizedTransaction } from '@/hooks/query/bank-rules';
import { useAccountTransactionsAllContext } from '../AccountTransactionsAllBoot';
import { handleCashFlowTransactionType } from '../utils';
import { useAccountTransactionsColumnsV2 } from './useAccountTransactionsColumnsV2';

// Строки «Всех транзакций» не имеют собственного `id` (сервер отдаёт
// reference_type + reference_id). Сервер сам использует эту пару как
// уникальный ключ записи, поэтому она безопасна как идентификатор строки.
const getTransactionRowId = (row: any) =>
  `${row.reference_type}-${row.reference_id}`;

function AccountTransactionsDataTableV2Root({
  // #withDrawerActions
  openDrawer,
  // #withBankingActions
  setCategorizedTransactionsSelected,
}: any) {
  const { cashflowTransactions, isCashFlowTransactionsLoading } =
    useAccountTransactionsAllContext() as any;

  const { mutateAsync: uncategorizeTransaction } = useUncategorizeTransaction(
    {},
  );
  const { mutateAsync: unmatchTransaction } =
    useUnmatchMatchedUncategorizedTransaction();

  const handleUncategorize = React.useCallback(
    (row: any) => {
      uncategorizeTransaction(row.uncategorized_transaction_id)
        .then(() =>
          AppToaster.show({
            message: intl.get('cashflow.notify.transaction_uncategorized'),
            intent: Intent.SUCCESS,
          }),
        )
        .catch(() =>
          AppToaster.show({
            message: intl.get('something_went_wrong'),
            intent: Intent.DANGER,
          }),
        );
    },
    [uncategorizeTransaction],
  );

  const handleUnmatch = React.useCallback(
    (row: any) => {
      unmatchTransaction({ id: row.uncategorized_transaction_id })
        .then(() =>
          AppToaster.show({
            message: intl.get('cashflow.notify.transaction_unmatched'),
            intent: Intent.SUCCESS,
          }),
        )
        .catch(() =>
          AppToaster.show({
            message: intl.get('something_went_wrong'),
            intent: Intent.DANGER,
          }),
        );
    },
    [unmatchTransaction],
  );

  const columns = useAccountTransactionsColumnsV2({
    onUncategorize: handleUncategorize,
    onUnmatch: handleUnmatch,
  });

  const handleRowClick = (row: any) =>
    handleCashFlowTransactionType(row, openDrawer);

  // Неконтролируемый выбор: пушим uncategorized_transaction_id выбранных строк в Redux
  // (для массового «разкатегоризировать» в панели действий).
  const handleSelectionChange = (ids: string[]) => {
    const selectedUncatIds = cashflowTransactions
      .filter(
        (t: any) =>
          ids.includes(getTransactionRowId(t)) &&
          t.uncategorized_transaction_id,
      )
      .map((t: any) => t.uncategorized_transaction_id);
    setCategorizedTransactionsSelected(selectedUncatIds);
  };

  return (
    <DataTable
      columns={columns}
      data={cashflowTransactions}
      getRowId={getTransactionRowId}
      loading={isCashFlowTransactionsLoading}
      enableSelection
      onSelectionChange={handleSelectionChange}
      onRowClick={handleRowClick}
      emptyState={
        <div className="px-3 py-8 text-center text-sm text-text-muted">
          {intl.get('cash_flow.account_transactions.no_results')}
        </div>
      }
    />
  );
}

export const AccountTransactionsDataTableV2 = compose(
  withDrawerActions,
  withBankingActions,
)(AccountTransactionsDataTableV2Root);
