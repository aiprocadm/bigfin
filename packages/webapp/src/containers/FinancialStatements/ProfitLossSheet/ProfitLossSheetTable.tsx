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
    // Даты периода нужны раскрытию суммы до операций: панель спрашивает
    // ровно тот отрезок, за который посчитана строка (этап 4 ТЗ, п. 4.2).
    query: { basis?: string; from_date?: string; to_date?: string };
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

import ReportDrillDownPanel, {
  DrillDownTarget,
} from '../ReportDrillDownPanel';
import { formattedAmount } from '@/utils';
import { formatVariance, planFactForRow } from '../planFactColumns';
import { useReportPlanFact } from '../useReportPlanFact';

/**
 * Раскрыть можно строку-счёт: у неё числовой номер. У итогов и расчётных
 * строк (INCOME, NET_INCOME) своих проводок нет — раскрывать нечего.
 */
const accountIdOf = (row: any): number | null => {
  const id = Number(row?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
};

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

  // Какая сумма сейчас раскрыта до операций (этап 4 ТЗ, п. 4.2).
  const [drillDown, setDrillDown] = React.useState<DrillDownTarget | null>(
    null,
  );

  // План по строкам отчёта (этап 4 ТЗ, п. 4.4). Нет бюджета — нет колонок.
  const planFact = useReportPlanFact(
    'profit_loss',
    query?.from_date,
    query?.to_date,
    // Метод учёта берётся из запроса ЭТОГО отчёта (остаток О4 ТЗ). Иначе
    // колонка «Отклонение» сравнивала бы план с фактом по начислению даже
    // тогда, когда на экране отчёт по оплате, — и ничего бы не упало.
    query?.basis,
  );

  // Строки сервера отдаём движку как есть; стабильная ссылка, чтобы
  // развёртка сбрасывалась только при реальной смене данных отчёта.
  const rows = React.useMemo<ReportTableRow[]>(
    () => table?.rows ?? [],
    [table],
  );

  // Колонки движка из колонок сервера: первая — название, деньги — вправо.
  // В конец добавляются «План» и «Отклонение», если по периоду есть бюджет.
  const columns = React.useMemo<ReportTableColumn[]>(() => {
    const leaves = flattenLeafColumns(table?.columns ?? []);

    const serverColumns: ReportTableColumn[] = leaves.map((column, index) => ({
      // Ключи листьев повторяются между периодами сравнения — индекс
      // делает React-ключ уникальным (значение берётся по cellIndex).
      key: `${column.key}-${index}`,
      label: column.label,
      align: column.key === 'name' ? 'left' : 'right',
      cellIndex: column.cell_index,
    }));

    if (!planFact?.available) return serverColumns;

    const money = (value: number) => formattedAmount(value, '');

    return serverColumns.concat([
      {
        key: 'plan-fact-plan',
        label: intl.get('reports.plan_fact.plan'),
        align: 'right',
        getValue: (row) => {
          const found = planFactForRow(row, planFact);
          return found ? money(found.plan) : '';
        },
      },
      {
        key: 'plan-fact-variance',
        label: intl.get('reports.plan_fact.variance'),
        align: 'right',
        getValue: (row) => {
          const found = planFactForRow(row, planFact);
          return found
            ? formatVariance(found.varianceAbs, found.variancePct, money)
            : '';
        },
      },
    ]);
  }, [table, planFact]);

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
      <ReportTable
        columns={columns}
        rows={rows}
        isFinalRow={isNetIncomeRow}
        canDrillDown={(row) => accountIdOf(row) !== null}
        onRowClick={(row) => {
          const accountId = accountIdOf(row);
          if (!accountId) return;

          setDrillDown({
            accountId,
            accountName: row.cells?.[0]?.value,
            fromDate: query?.from_date ?? '',
            toDate: query?.to_date ?? '',
          });
        }}
      />

      <ReportDrillDownPanel
        target={drillDown}
        onClose={() => setDrillDown(null)}
      />
    </ReportSheet>
  );
}
