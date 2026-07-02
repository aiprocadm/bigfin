import * as React from 'react';
import intl from 'react-intl-universal';

import {
  ReportSheet,
  ReportTable,
  type ReportTableColumn,
  type ReportTableRow,
} from '@/components/ui/report-table';

import { useProfitLossSheetContext } from './ProfitLossProvider';

/** Колонка таблицы ОПиУ в формате сервера (snake_case на клиенте). */
interface ProfitLossServerColumn {
  key: string;
  label: string;
  /** Индекс ячейки в row.cells — сервер проставляет только листьям. */
  cell_index?: number;
  children?: ProfitLossServerColumn[];
}

/** Значение контекста ОПиУ (провайдер легаси без типов — типизируем локально). */
interface ProfitLossSheetContextValue {
  profitLossSheet: {
    table: {
      columns?: ProfitLossServerColumn[];
      rows?: ReportTableRow[];
    };
    query: { basis?: string };
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
}

const useProfitLossContext =
  useProfitLossSheetContext as unknown as () => ProfitLossSheetContextValue;

/**
 * Разворачивает дерево колонок сервера до листьев: только листья имеют
 * cell_index (у родителей-групп вроде «Итого» с процентами/сравнениями его нет).
 */
const flattenLeafColumns = (
  columns: ProfitLossServerColumn[],
): ProfitLossServerColumn[] =>
  columns.reduce<ProfitLossServerColumn[]>((acc, column) => {
    if (column.children && column.children.length > 0) {
      return acc.concat(flattenLeafColumns(column.children));
    }
    acc.push(column);
    return acc;
  }, []);

interface ProfitLossSheetTableProps {
  companyName?: string;
}

/**
 * Таблица отчёта о прибылях и убытках — новый движок ReportSheet + ReportTable.
 */
export default function ProfitLossSheetTable({
  companyName,
}: ProfitLossSheetTableProps) {
  const {
    profitLossSheet: { table, query, meta },
  } = useProfitLossContext();

  // Строки сервера отдаём движку как есть; стабильная ссылка, чтобы
  // развёртка сбрасывалась только при реальной смене данных отчёта.
  const rows = React.useMemo<ReportTableRow[]>(
    () => table?.rows ?? [],
    [table],
  );

  // Колонки движка из колонок сервера: первая — название, деньги — вправо.
  const columns = React.useMemo<ReportTableColumn[]>(() => {
    const leaves = flattenLeafColumns(table?.columns ?? []);

    return leaves.map((column, index) => ({
      // Ключи листьев повторяются между периодами сравнения — индекс
      // делает React-ключ уникальным (значение берётся по cellIndex).
      key: `${column.key}-${index}`,
      label: column.label,
      align: column.key === 'name' ? 'left' : 'right',
      cellIndex: column.cell_index,
    }));
  }, [table]);

  // Финальная плашка отчёта — строка «Чистая прибыль».
  const isNetIncomeRow = React.useCallback(
    (row: ReportTableRow) => row.id === 'NET_INCOME',
    [],
  );

  return (
    <ReportSheet
      companyName={companyName}
      sheetType={
        intl.get('profit_loss_sheet.human_title') ||
        intl.get('profit_loss_sheet')
      }
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
      basis={query?.basis}
    >
      <ReportTable columns={columns} rows={rows} isFinalRow={isNetIncomeRow} />
    </ReportSheet>
  );
}
