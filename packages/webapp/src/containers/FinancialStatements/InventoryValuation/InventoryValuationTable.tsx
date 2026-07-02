import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useInventoryValuationContext } from './InventoryValuationProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface InventoryValuationServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: InventoryValuationServerColumn[];
}

interface InventoryValuationContextValue {
  inventoryValuation: {
    table: {
      columns: InventoryValuationServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedInventoryValuationContext =
  useInventoryValuationContext as unknown as () => InventoryValuationContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: InventoryValuationServerColumn[],
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

interface InventoryValuationTableProps {
  companyName?: string;
}

/**
 * Оценка запасов — движок ReportSheet + ReportTable.
 */
export default function InventoryValuationTable({
  companyName,
}: InventoryValuationTableProps) {
  const {
    inventoryValuation: { table, meta },
  } = useTypedInventoryValuationContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('inventory_valuation')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
    >
      <ReportTable
        columns={columns}
        rows={table.rows ?? []}
        isFinalRow={() => false}
        emptyText={intl.get(
          'there_were_no_inventory_transactions_during_the_selected_date_range',
        )}
      />
    </ReportSheet>
  );
}
