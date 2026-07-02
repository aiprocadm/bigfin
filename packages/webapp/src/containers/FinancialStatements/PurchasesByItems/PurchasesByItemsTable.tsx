import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { usePurchaseByItemsContext } from './PurchasesByItemsProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface PurchasesByItemsServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: PurchasesByItemsServerColumn[];
}

interface PurchasesByItemsContextValue {
  purchaseByItems: {
    table: {
      columns: PurchasesByItemsServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedPurchasesByItemsContext =
  usePurchaseByItemsContext as unknown as () => PurchasesByItemsContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: PurchasesByItemsServerColumn[],
  parentKey?: string,
  parentLabel?: string,
): ReportTableColumn[] {
  return columns.flatMap((column): ReportTableColumn[] => {
    const key = parentKey ? `${parentKey}.${column.key}` : column.key;

    if (column.children && column.children.length > 0) {
      return flattenServerColumns(column.children, key, column.label);
    }
    const label =
      parentLabel && parentLabel !== column.label
        ? `${parentLabel} — ${column.label}`
        : column.label;

    return [
      {
        key,
        label,
        align: column.key === 'name' ? undefined : 'right',
        cellIndex: column.cell_index,
      },
    ];
  });
}

interface PurchasesByItemsTableProps {
  companyName?: string;
}

/**
 * Закупки по товарам — движок ReportSheet + ReportTable.
 */
export default function PurchasesByItemsTable({
  companyName,
}: PurchasesByItemsTableProps) {
  const {
    purchaseByItems: { table, meta },
  } = useTypedPurchasesByItemsContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('purchases_by_items')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
    >
      <ReportTable
        columns={columns}
        rows={table.rows ?? []}
        isFinalRow={() => false}
        emptyText={intl.get(
          'there_were_no_purchases_during_the_selected_date_range',
        )}
      />
    </ReportSheet>
  );
}
