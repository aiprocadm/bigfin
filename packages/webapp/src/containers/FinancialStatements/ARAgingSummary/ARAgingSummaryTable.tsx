import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useARAgingSummaryContext } from './ARAgingSummaryProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface ARAgingServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: ARAgingServerColumn[];
}

interface ARAgingSummaryContextValue {
  ARAgingSummary: {
    table: {
      columns: ARAgingServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedARAgingContext =
  useARAgingSummaryContext as unknown as () => ARAgingSummaryContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: ARAgingServerColumn[],
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

interface ARAgingSummaryTableProps {
  organizationName?: string;
}

/**
 * Старение дебиторской задолженности — движок ReportSheet + ReportTable.
 */
export default function ReceivableAgingSummaryTable({
  organizationName,
}: ARAgingSummaryTableProps) {
  const {
    ARAgingSummary: { table, meta },
  } = useTypedARAgingContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={organizationName}
      sheetType={intl.get('receivable_aging_summary')}
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
