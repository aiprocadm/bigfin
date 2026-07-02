import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useTrialBalanceSheetContext } from './TrialBalanceProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface TrialBalanceServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: TrialBalanceServerColumn[];
}

interface TrialBalanceSheetContextValue {
  trialBalanceSheet: {
    table: {
      columns: TrialBalanceServerColumn[];
      rows: ReportTableRow[];
    };
    query: { basis?: string };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedTrialBalanceContext =
  useTrialBalanceSheetContext as unknown as () => TrialBalanceSheetContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: TrialBalanceServerColumn[],
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

interface TrialBalanceSheetTableProps {
  companyName?: string;
}

/**
 * Оборотно-сальдовая ведомость на движке ReportSheet + ReportTable.
 */
export default function TrialBalanceSheetTable({
  companyName,
}: TrialBalanceSheetTableProps) {
  const {
    trialBalanceSheet: { table, meta },
  } = useTypedTrialBalanceContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('trial_balance_sheet')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
      // Легаси показывал фиксированную подпись «кассовый метод» — сохраняем.
      basis="cash"
    >
      <ReportTable
        columns={columns}
        rows={table.rows ?? []}
        // Единственная TOTAL-строка внизу — её выделяет стилизация TOTAL.
        isFinalRow={() => false}
      />
    </ReportSheet>
  );
}
