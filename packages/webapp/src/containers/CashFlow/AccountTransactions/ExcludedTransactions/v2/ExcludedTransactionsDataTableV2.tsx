import React from 'react';
import intl from 'react-intl-universal';
import { DataTable } from '@/components/ui/data-table';
import { compose } from '@/utils';
import { useLocalStorage } from '@/hooks';
import { withBankingActions } from '../../../withBankingActions';
import { useUnexcludeUncategorizedTransaction } from '@/hooks/query/bank-rules';
import { useExcludedTransactionsBoot } from '../ExcludedTransactionsTableBoot';
import { useExcludedTransactionsColumnsV2 } from './useExcludedTransactionsColumnsV2';
import { notifyTransactionResult } from '../../v2/notifyTransactionResult';
import { selectRowsByIds } from '../../v2/selectRowsByIds';

// У исключённых транзакций есть собственный `id` (в отличие от «Всех»/«Ожидающих»),
// он же — ключ для выбора и восстановления.
const getRowId = (row: any) => String(row.id);

// Отдельный ключ персиста ширин под V2-таблицу: легаси хранил карту ширин с
// другими ключами колонок (TABLES.UNCATEGORIZED_ACCOUNT_TRANSACTIONS) — смешивать нельзя.
const COLUMN_WIDTHS_KEY = 'EXCLUDED_BANK_TRANSACTIONS_V2.columns_widths';

function ExcludedTransactionsDataTableV2Root({
  // #withBankingActions
  setExcludedTransactionsSelected,
}: any) {
  const { excludedBankTransactions, isExcludedTransactionsLoading } =
    useExcludedTransactionsBoot() as any;

  const { mutateAsync: unexcludeBankTransaction } =
    useUnexcludeUncategorizedTransaction();

  const [columnWidths, setColumnWidths] = useLocalStorage(
    COLUMN_WIDTHS_KEY,
    {},
  );

  const handleRestore = React.useCallback(
    (row: any) =>
      notifyTransactionResult(
        unexcludeBankTransaction(row.id),
        'cashflow.notify.excluded_transaction_restored',
      ),
    [unexcludeBankTransaction],
  );

  const columns = useExcludedTransactionsColumnsV2({ onRestore: handleRestore });

  // Примитив отдаёт строковые getRowId; мапим обратно в исходные id для Redux
  // (панель массовых действий ждёт реальные идентификаторы транзакций).
  const handleSelectionChange = React.useCallback(
    (ids: string[]) => {
      const selectedIds = selectRowsByIds(
        excludedBankTransactions,
        ids,
        getRowId,
      ).map((t: any) => t.id);
      setExcludedTransactionsSelected(selectedIds);
    },
    [excludedBankTransactions, setExcludedTransactionsSelected],
  );

  return (
    <DataTable
      columns={columns}
      data={excludedBankTransactions || []}
      getRowId={getRowId}
      loading={isExcludedTransactionsLoading}
      virtualized
      enableSelection
      onSelectionChange={handleSelectionChange}
      resizableColumns
      columnWidths={columnWidths}
      onColumnWidthsChange={setColumnWidths}
      emptyState={
        <div className="px-3 py-8 text-center text-sm text-text-muted">
          {intl.get('cash_flow.excluded_transactions.no_results')}
        </div>
      }
    />
  );
}

export const ExcludedTransactionsDataTableV2 = compose(withBankingActions)(
  ExcludedTransactionsDataTableV2Root,
);
