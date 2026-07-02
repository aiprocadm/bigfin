import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useCustomersBalanceSummaryContext } from './CustomersBalanceSummaryProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface CustomersBalanceServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: CustomersBalanceServerColumn[];
}

interface CustomersBalanceSummaryContextValue {
  CustomerBalanceSummary: {
    table: {
      columns: CustomersBalanceServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedCustomersBalanceContext =
  useCustomersBalanceSummaryContext as unknown as () => CustomersBalanceSummaryContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: CustomersBalanceServerColumn[],
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

interface CustomersBalanceSummaryTableProps {
  companyName?: string;
}

/**
 * Сальдо по клиентам — движок ReportSheet + ReportTable.
 */
export default function CustomersBalanceSummaryTable({
  companyName,
}: CustomersBalanceSummaryTableProps) {
  const {
    CustomerBalanceSummary: { table, meta },
  } = useTypedCustomersBalanceContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('customers_balance_summary')}
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
