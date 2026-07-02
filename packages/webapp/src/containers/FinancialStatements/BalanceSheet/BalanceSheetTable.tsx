import { useMemo } from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';
import { useBalanceSheetContext } from './BalanceSheetProvider';

/**
 * Колонка отчётной таблицы в формате сервера FinancialStatements
 * (snake_case на клиенте): total-колонка и колонки date-periods могут
 * содержать вложенные children (сравнения: прошлый год/период, проценты).
 */
interface BalanceSheetServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: BalanceSheetServerColumn[];
}

interface BalanceSheetContextValue {
  balanceSheet: {
    table: {
      columns: BalanceSheetServerColumn[];
      rows: ReportTableRow[];
    };
    query: {
      basis?: string;
    };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

// Легаси-контекст без типов — кастуем локально.
const useTypedBalanceSheetContext =
  useBalanceSheetContext as unknown as () => BalanceSheetContextValue;

/**
 * Разворачивает дерево серверных колонок в плоский список колонок
 * ReportTable: листья несут cell_index; у вложенных листьев подпись
 * склеивается с родительской («Янв 2026 — % от колонок»), чтобы
 * колонки сравнений оставались различимы без групповых заголовков.
 */
function flattenServerColumns(
  columns: BalanceSheetServerColumn[],
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
        // Первая колонка — название счёта; остальные — деньги/проценты.
        align: column.key === 'name' ? undefined : 'right',
        cellIndex: column.cell_index,
      },
    ];
  });
}

interface BalanceSheetTableProps {
  companyName?: string;
}

/**
 * Таблица баланса на движке ReportSheet + ReportTable
 * (стандарт «Простота Bigfin», без Blueprint).
 */
export default function BalanceSheetTable({
  companyName,
}: BalanceSheetTableProps) {
  const {
    balanceSheet: { table, query, meta },
  } = useTypedBalanceSheetContext();

  const columns = useMemo(
    () => flattenServerColumns(table.columns),
    [table.columns],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={intl.get('balance_sheet')}
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
      basis={query.basis}
    >
      <ReportTable
        columns={columns}
        rows={table.rows}
        // У баланса нет единой финальной строки («Чистая прибыль» в ОПиУ):
        // итоги «Итого активы» и «Итого обязательства и капитал» — вложенные
        // TOTAL-строки, их выделяет стилизация TOTAL (полужирный + граница).
        isFinalRow={() => false}
      />
    </ReportSheet>
  );
}
