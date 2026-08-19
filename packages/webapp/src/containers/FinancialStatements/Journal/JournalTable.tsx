import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useJournalSheetContext } from './JournalProvider';

/** Колонка в формате сервера FinancialStatements (snake_case на клиенте). */
interface JournalServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: JournalServerColumn[];
}

interface JournalSheetContextValue {
  journalSheet: {
    table: {
      columns: JournalServerColumn[];
      rows: ReportTableRow[];
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedJournalContext =
  useJournalSheetContext as unknown as () => JournalSheetContextValue;

/** Разворачивает дерево серверных колонок до листьев (несут cell_index). */
function flattenServerColumns(
  columns: JournalServerColumn[],
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
          column.key === 'credit' || column.key === 'debit'
            ? 'right'
            : undefined,
        cellIndex: column.cell_index,
      },
    ];
  });
}

interface JournalTableProps {
  companyName?: string;
}

/**
 * Журнал — движок ReportSheet + ReportTable (виртуализация: записей тысячи).
 */
export function JournalTable({ companyName }: JournalTableProps) {
  const { journalSheet } = useTypedJournalContext();
  // Пустой отчёт — это отказ сервера, а не поломка кода: разбираем со
  // значением по умолчанию, иначе экран падает вместо сообщения.
  const table = journalSheet?.table;
  const meta = journalSheet?.meta;

  const columns = useMemo(
    () => flattenServerColumns(table?.columns ?? []),
    [table?.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('journal_sheet')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
      className="w-full"
    >
      <ReportTable
        columns={columns}
        rows={table?.rows ?? []}
        virtualized
        isFinalRow={() => false}
        emptyText={intl.get(
          'this_report_does_not_contain_any_data_between_date_period',
        )}
      />
    </ReportSheet>
  );
}
