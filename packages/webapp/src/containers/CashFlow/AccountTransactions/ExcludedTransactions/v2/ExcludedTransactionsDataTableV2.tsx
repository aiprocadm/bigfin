import React from 'react';
import intl from 'react-intl-universal';
import { Intent } from '@blueprintjs/core';
import { DataTable } from '@/components/ui/data-table';
import { AppToaster } from '@/components';
import { compose } from '@/utils';
import { useLocalStorage } from '@/hooks';
import { withBankingActions } from '../../../withBankingActions';
import { useUnexcludeUncategorizedTransaction } from '@/hooks/query/bank-rules';
import { useExcludedTransactionsBoot } from '../ExcludedTransactionsTableBoot';
import { useExcludedTransactionsColumnsV2 } from './useExcludedTransactionsColumnsV2';

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
    (row: any) => {
      unexcludeBankTransaction(row.id)
        .then(() =>
          AppToaster.show({
            message: intl.get('cashflow.notify.excluded_transaction_restored'),
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
    [unexcludeBankTransaction],
  );

  const columns = useExcludedTransactionsColumnsV2({ onRestore: handleRestore });

  // Примитив отдаёт строковые getRowId; мапим обратно в исходные id для Redux
  // (панель массовых действий ждёт реальные идентификаторы транзакций).
  const handleSelectionChange = React.useCallback(
    (ids: string[]) => {
      const selectedIds = (excludedBankTransactions || [])
        .filter((t: any) => ids.includes(String(t.id)))
        .map((t: any) => t.id);
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
