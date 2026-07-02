import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useVendorsBalanceSummaryContext } from './VendorsBalanceSummaryProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface VendorsBalanceServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: VendorsBalanceServerColumn[];
}

interface VendorsBalanceSummaryContextValue {
  VendorBalanceSummary: {
    table: {
      columns: VendorsBalanceServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedVendorsBalanceContext =
  useVendorsBalanceSummaryContext as unknown as () => VendorsBalanceSummaryContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: VendorsBalanceServerColumn[],
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

interface VendorsBalanceSummaryTableProps {
  organizationName?: string;
}

/**
 * Сальдо по поставщикам — движок ReportSheet + ReportTable.
 */
export default function VendorsBalanceSummaryTable({
  organizationName,
}: VendorsBalanceSummaryTableProps) {
  const {
    VendorBalanceSummary: { table, meta },
  } = useTypedVendorsBalanceContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={organizationName}
      sheetType={intl.get('vendors_balance_summary')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
    >
      <ReportTable
        columns={columns}
        rows={table.rows ?? []}
        isFinalRow={() => false}
      />
    </ReportSheet>
  );
}
