import * as React from 'react';
import intl from 'react-intl-universal';

import { ReportSheet, ReportTable } from '@/components/ui/report-table';
import type {
  ReportTableColumn,
  ReportTableRow,
} from '@/components/ui/report-table';

import { useCashFlowStatementContext } from './CashFlowStatementProvider';
import ReportDrillDownPanel, {
  type DrillDownTarget,
} from '../ReportDrillDownPanel';
import {
  drillDownAccountId,
  reportDrillDownRange,
} from '../reportDrillDownRange';

/**
 * Таблица отчёта о движении денежных средств (ДДС) на движке ReportTable
 * по стандарту «Простота Bigfin»: иерархия строк, сворачиваемые группы,
 * TOTAL с волосяной границей, финальная строка — плашка.
 */

/** Колонка таблицы в ответе сервера FinancialStatements (snake_case). */
interface CashFlowServerColumn {
  key: string;
  label: string;
  cell_index?: number;
  children?: CashFlowServerColumn[];
}

/** Локальная типизация значения легаси-контекста (провайдер под ts-nocheck (директива легаси)). */
interface CashFlowStatementContextValue {
  cashFlowStatement: {
    columns: CashFlowServerColumn[];
    tableRows: ReportTableRow[];
    meta?: {
      formatted_date_range?: string;
      formatted_as_date?: string;
    };
  };
  query: { basis?: string };
}

const useTypedCashFlowStatementContext =
  useCashFlowStatementContext as unknown as () => CashFlowStatementContextValue;

/** Финальная строка отчёта — «Остаток денег на конец периода». */
const FINAL_ROW_ID = 'CASH_END_PERIOD';

interface CashFlowStatementTableProps {
  companyName?: string;
}

/**
 * Cash flow statement table.
 */
export default function CashFlowStatementTable({
  companyName,
}: CashFlowStatementTableProps) {
  const {
    cashFlowStatement: { columns, tableRows, meta },
    query,
  } = useTypedCashFlowStatementContext();

  // Какая строка сейчас раскрыта до операций (этап 4 ТЗ, п. 4.2).
  const [drillDown, setDrillDown] = React.useState<DrillDownTarget | null>(
    null,
  );
  const range = reportDrillDownRange(query);

  // Колонки движка из колонок сервера: первая — название счёта (слева),
  // суммы («Итого», периоды) — справа, tabular-nums (движок сам).
  const reportColumns = React.useMemo<ReportTableColumn[]>(
    () =>
      columns.map((column, index) => ({
        key: column.key,
        label:
          column.key === 'name'
            ? intl.get('account_name')
            : column.key === 'total'
              ? intl.get('total')
              : column.label,
        align: column.key === 'name' ? undefined : 'right',
        cellIndex: column.cell_index ?? index,
      })),
    [columns],
  );

  return (
    <ReportSheet
      className="my-6 w-full max-w-4xl"
      companyName={companyName}
      sheetType={
        intl.get('cash_flow_statement.human_title') ||
        intl.get('statement_of_cash_flow')
      }
      dateText={meta?.formatted_date_range ?? meta?.formatted_as_date}
      basis={query.basis}
    >
      <ReportTable
        columns={reportColumns}
        rows={tableRows}
        defaultExpandedDepth={4}
        isFinalRow={(row) => row.id === FINAL_ROW_ID}
        canDrillDown={(row) => drillDownAccountId(row.id) !== null}
        onRowClick={(row) => {
          const accountId = drillDownAccountId(row.id);

          if (!accountId) return;

          setDrillDown({
            accountId,
            accountName: row.cells?.[0]?.value,
            fromDate: range.fromDate,
            toDate: range.toDate,
          });
        }}
      />

      {/* Строка ДДС считается от остаточных счетов, поэтому панель показывает
          цепочку: остаток на начало + оборот = остаток на конец. */}
      <ReportDrillDownPanel
        target={drillDown}
        onClose={() => setDrillDown(null)}
        kind="balance"
      />
    </ReportSheet>
  );
}
