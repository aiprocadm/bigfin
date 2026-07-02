import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useAPAgingSummaryContext } from './APAgingSummaryProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface APAgingServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: APAgingServerColumn[];
}

interface APAgingSummaryContextValue {
  APAgingSummary: {
    table: {
      columns: APAgingServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedAPAgingContext =
  useAPAgingSummaryContext as unknown as () => APAgingSummaryContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: APAgingServerColumn[],
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

interface APAgingSummaryTableProps {
  organizationName?: string;
}

/**
 * Старение кредиторской задолженности — движок ReportSheet + ReportTable.
 */
export default function APAgingSummaryTable({
  organizationName,
}: APAgingSummaryTableProps) {
  const {
    APAgingSummary: { table, meta },
  } = useTypedAPAgingContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={organizationName}
      sheetType={intl.get('payable_aging_summary')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
    >
      <ReportTable
        columns={columns}
        rows={table.rows ?? []}
        // Итоговую строку выделяет стилизация TOTAL (row_types: ['total']).
        isFinalRow={() => false}
      />
    </ReportSheet>
  );
}
