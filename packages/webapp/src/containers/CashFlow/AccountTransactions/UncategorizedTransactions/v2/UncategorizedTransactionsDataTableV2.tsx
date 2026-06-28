import React from 'react';
import intl from 'react-intl-universal';
import { DataTable } from '@/components/ui/data-table';
import { compose } from '@/utils';
import { useLocalStorage } from '@/hooks';
import { withBankingActions } from '../../../withBankingActions';
import { withBanking } from '../../../withBanking';
import { useExcludeUncategorizedTransaction } from '@/hooks/query/bank-rules';
import { useAccountUncategorizedTransactionsContext } from '../../AllTransactionsUncategorizedBoot';
import { useUncategorizedTransactionsColumnsV2 } from './useUncategorizedTransactionsColumnsV2';
import { notifyTransactionResult } from '../../v2/notifyTransactionResult';

const getRowId = (row: any) => String(row.id);

const COLUMN_WIDTHS_KEY = 'UNCATEGORIZED_BANK_TRANSACTION_V2.columns_widths';

function UncategorizedTransactionsDataTableV2Root({
  // #withBanking
  enableMultipleCategorization,
  // #withBankingActions
  setUncategorizedTransactionIdForMatching,
  setUncategorizedTransactionsSelected,
  addTransactionsToCategorizeSelected,
  setTransactionsToCategorizeSelected,
}: any) {
  const {
    uncategorizedTransactions,
    isUncategorizedTransactionsLoading,
  } = useAccountUncategorizedTransactionsContext() as any;

  const { mutateAsync: excludeTransaction } =
    useExcludeUncategorizedTransaction();

  const [columnWidths, setColumnWidths] = useLocalStorage(
    COLUMN_WIDTHS_KEY,
    {},
  );

  // Клик по строке: в режиме мультикатегоризации — копим в набор, иначе —
  // одиночный выбор к категоризации (паритет с легаси handleCellClick).
  const handleRowClick = React.useCallback(
    (row: any) => {
      if (enableMultipleCategorization) {
        addTransactionsToCategorizeSelected(row.id);
      } else {
        setTransactionsToCategorizeSelected(row.id);
      }
    },
    [
      enableMultipleCategorization,
      addTransactionsToCategorizeSelected,
      setTransactionsToCategorizeSelected,
    ],
  );

  // Действие меню «Категоризировать» — открыть сопоставление выбранной транзакции.
  const handleCategorize = React.useCallback(
    (row: any) => setUncategorizedTransactionIdForMatching(row.id),
    [setUncategorizedTransactionIdForMatching],
  );

  const handleExclude = React.useCallback(
    (row: any) =>
      notifyTransactionResult(
        excludeTransaction(row.id),
        'cashflow.notify.transaction_excluded',
      ),
    [excludeTransaction],
  );

  const columns = useUncategorizedTransactionsColumnsV2({
    onCategorize: handleCategorize,
    onExclude: handleExclude,
  });

  // Левый мультивыбор (массовые действия) — отдельный от правого include-набора.
  // Примитив отдаёт строковые getRowId; мапим обратно в исходные id.
  const handleSelectionChange = React.useCallback(
    (ids: string[]) => {
      const transactionIds = (uncategorizedTransactions || [])
        .filter((t: any) => ids.includes(String(t.id)))
        .map((t: any) => t.id);
      setUncategorizedTransactionsSelected(transactionIds);
    },
    [uncategorizedTransactions, setUncategorizedTransactionsSelected],
  );

  return (
    <DataTable
      columns={columns}
      data={uncategorizedTransactions || []}
      getRowId={getRowId}
      loading={isUncategorizedTransactionsLoading}
      virtualized
      enableSelection
      onSelectionChange={handleSelectionChange}
      onRowClick={handleRowClick}
      resizableColumns
      columnWidths={columnWidths}
      onColumnWidthsChange={setColumnWidths}
      emptyState={
        <div className="px-3 py-8 text-center text-sm text-text-muted">
          {intl.get('cash_flow.uncategorized_transactions.no_results')}
        </div>
      }
    />
  );
}

export const UncategorizedTransactionsDataTableV2 = compose(
  withBankingActions,
  withBanking(({ enableMultipleCategorization }: any) => ({
    enableMultipleCategorization,
  })),
)(UncategorizedTransactionsDataTableV2Root);
