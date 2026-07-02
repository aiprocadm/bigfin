import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useGeneralLedgerContext } from './GeneralLedgerProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface GeneralLedgerServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: GeneralLedgerServerColumn[];
}

interface GeneralLedgerContextValue {
  generalLedger: {
    table: {
      columns: GeneralLedgerServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedGeneralLedgerContext =
  useGeneralLedgerContext as unknown as () => GeneralLedgerContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: GeneralLedgerServerColumn[],
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
        align:
          column.key === 'credit' ||
          column.key === 'debit' ||
          column.key === 'amount' ||
          column.key === 'running_balance'
            ? 'right'
            : undefined,
        cellIndex: column.cell_index,
      },
    ];
  });
}

interface GeneralLedgerTableProps {
  companyName?: string;
}

/**
 * Главная книга — движок ReportSheet + ReportTable
 * (виртуализация: транзакций тысячи; группы-счета развёрнуты на 1 уровень).
 */
export default function GeneralLedgerTable({
  companyName,
}: GeneralLedgerTableProps) {
  const {
    generalLedger: { table, meta },
  } = useTypedGeneralLedgerContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns ?? []),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('general_ledger_sheet')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
      className="w-full"
    >
      <ReportTable
        columns={columns}
        rows={table.rows ?? []}
        virtualized
        defaultExpandedDepth={1}
        isFinalRow={() => false}
        emptyText={intl.get(
          'this_report_does_not_contain_any_data_between_date_period',
        )}
      />
    </ReportSheet>
  );
}
