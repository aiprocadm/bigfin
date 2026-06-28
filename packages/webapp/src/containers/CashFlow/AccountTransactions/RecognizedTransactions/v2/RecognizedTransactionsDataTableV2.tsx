import React from 'react';
import intl from 'react-intl-universal';
import { DataTable } from '@/components/ui/data-table';
import { compose } from '@/utils';
import { useLocalStorage } from '@/hooks';
import { withBankingActions } from '../../../withBankingActions';
import { useExcludeUncategorizedTransaction } from '@/hooks/query/bank-rules';
import { useRecognizedTransactionsBoot } from '../RecognizedTransactionsTableBoot';
import { useRecognizedTransactionsColumnsV2 } from './useRecognizedTransactionsColumnsV2';
import { notifyTransactionResult } from '../../v2/notifyTransactionResult';

// Распознанные строки идентифицируем по uncategorized_transaction_id —
// он же ключ категоризации/исключения.
const getRowId = (row: any) => String(row.uncategorized_transaction_id);

const COLUMN_WIDTHS_KEY = 'RECOGNIZED_BANK_TRANSACTIONS_V2.columns_widths';

function RecognizedTransactionsDataTableV2Root({
  // #withBankingActions
  setTransactionsToCategorizeSelected,
}: any) {
  const { recognizedTransactions, isRecongizedTransactionsLoading } =
    useRecognizedTransactionsBoot() as any;

  const { mutateAsync: excludeBankTransaction } =
    useExcludeUncategorizedTransaction();

  const [columnWidths, setColumnWidths] = useLocalStorage(
    COLUMN_WIDTHS_KEY,
    {},
  );

  // Клик по строке открывает категоризацию выбранной транзакции (паритет с
  // легаси handleCellClick → setTransactionsToCategorizeSelected).
  const handleCategorize = React.useCallback(
    (row: any) =>
      setTransactionsToCategorizeSelected(row.uncategorized_transaction_id),
    [setTransactionsToCategorizeSelected],
  );

  const handleExclude = React.useCallback(
    (row: any) =>
      notifyTransactionResult(
        excludeBankTransaction(row.uncategorized_transaction_id),
        'cashflow.notify.transaction_excluded',
      ),
    [excludeBankTransaction],
  );

  const columns = useRecognizedTransactionsColumnsV2({
    onCategorize: handleCategorize,
    onExclude: handleExclude,
  });

  return (
    <DataTable
      columns={columns}
      data={recognizedTransactions || []}
      getRowId={getRowId}
      loading={isRecongizedTransactionsLoading}
      virtualized
      onRowClick={handleCategorize}
      resizableColumns
      columnWidths={columnWidths}
      onColumnWidthsChange={setColumnWidths}
      emptyState={
        <div className="px-3 py-8 text-center text-sm text-text-muted">
          {intl.get('cash_flow.recognized_transactions.no_results')}
        </div>
      }
    />
  );
}

export const RecognizedTransactionsDataTableV2 = compose(withBankingActions)(
  RecognizedTransactionsDataTableV2Root,
);
