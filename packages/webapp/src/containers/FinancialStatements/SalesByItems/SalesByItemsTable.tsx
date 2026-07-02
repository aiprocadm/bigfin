import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useSalesByItemsContext } from './SalesByItemProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface SalesByItemsServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: SalesByItemsServerColumn[];
}

interface SalesByItemsContextValue {
  salesByItems: {
    table: {
      columns: SalesByItemsServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedSalesByItemsContext =
  useSalesByItemsContext as unknown as () => SalesByItemsContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: SalesByItemsServerColumn[],
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

interface SalesByItemsTableProps {
  companyName?: string;
}

/**
 * Продажи по товарам — движок ReportSheet + ReportTable.
 */
export default function SalesByItemsTable({
  companyName,
}: SalesByItemsTableProps) {
  const {
    salesByItems: { table, meta },
  } = useTypedSalesByItemsContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('sales_by_items')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
    >
      <ReportTable
        columns={columns}
        rows={table.rows ?? []}
        isFinalRow={() => false}
        emptyText={intl.get(
          'there_were_no_sales_during_the_selected_date_range',
        )}
      />
    </ReportSheet>
  );
}
