import React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { usePendingTransactionsContext } from '../PendingTransactionsTableBoot';
import { usePendingTransactionsColumnsV2 } from './usePendingTransactionsColumnsV2';
import { DataTableEmpty } from '../../v2/DataTableEmpty';

// Строки ожидающих транзакций не имеют собственного `id` (сервер отдаёт
// reference_type + reference_id). Та же составная пара, что у слайса 2 —
// сервер использует её как уникальный ключ записи.
const getRowId = (row: any) => `${row.reference_type}-${row.reference_id}`;

/**
 * Таблица «Ожидающие транзакции» на примитиве components/ui/data-table.tsx
 * (D-redesign, слайс 4a). Паритет с легаси `PendingTransactionsDataTable`:
 * только показ, без выбора/клика/действий. Данные берутся из существующего
 * контекста `usePendingTransactionsContext` — слой данных не меняется.
 */
export function PendingTransactionsDataTableV2() {
  const columns = usePendingTransactionsColumnsV2();
  const { pendingTransactions, isPendingTransactionsLoading } =
    usePendingTransactionsContext() as any;

  return (
    <DataTable
      columns={columns}
      data={pendingTransactions || []}
      getRowId={getRowId}
      loading={isPendingTransactionsLoading}
      virtualized
      emptyState={
        <DataTableEmpty messageKey="cash_flow.pending_transactions.no_results" />
      }
    />
  );
}
