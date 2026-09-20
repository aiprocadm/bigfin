import React from 'react';
import intl from 'react-intl-universal';
import { ScreenHelp } from '@/components/ui/screen-help';
import moment from 'moment';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DateField } from '@/components/ui/date-field';
import { Skeleton } from '@/components/ui/skeleton';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import {
  useCashFlowArticlesTable,
  useCashFlowArticlesCsvExport,
  useCashFlowArticlesXlsxExport,
} from '@/hooks/query/FinancialReports';

import {
  defaultExpandedIds,
  flattenReportRows,
  isTotalRow,
  ReportTableRow,
} from './cashFlowArticlesRows';

/**
 * Отчёт «Деньги (ДДС по статьям)» — главный денежный отчёт продукта
 * (FIN-013 ТЗ-2).
 *
 * ПОЧЕМУ НОВЫЙ ЭКРАН, А НЕ ПРАВКА СТАРОГО. Прежний ДДС считается КОСВЕННЫМ
 * методом: «чистая прибыль плюс изменение дебиторской задолженности минус
 * изменение запасов». Бухгалтеру это привычно, предпринимателю без
 * бухгалтерского образования — нет. Прежний отчёт остаётся на своём месте и
 * никуда не девается: он нужен, просто не всем.
 *
 * ПЕРЕКЛЮЧАТЕЛЯ «УЧЁТ» ЗДЕСЬ НЕТ. Движение денег кассово по определению, и
 * переключатель, который ничего не меняет, хуже его отсутствия: человек
 * решит, что видит две разные картины.
 */
export default function CashFlowArticles() {
  const [fromDate, setFromDate] = React.useState(
    moment().startOf('month').format('YYYY-MM-DD'),
  );
  const [toDate, setToDate] = React.useState(
    moment().endOf('month').format('YYYY-MM-DD'),
  );

  const query = React.useMemo(() => ({ fromDate, toDate }), [fromDate, toDate]);
  const { data, isLoading } = useCashFlowArticlesTable(query);

  const rows: ReportTableRow[] = (data as any)?.table?.rows ?? [];
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  // Раскрытие пересчитывается, когда пришли новые строки: набор
  // идентификаторов у другого периода другой.
  React.useEffect(() => {
    setExpanded(defaultExpandedIds(rows));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const { open: exportCsv } = useCashFlowArticlesCsvExport(query) as any;
  const { open: exportXlsx } = useCashFlowArticlesXlsxExport(query) as any;

  const visible = flattenReportRows(rows, expanded);

  const toggle = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-semibold">
              {intl.get('cash_flow_articles.page_title')}
            </h1>
            {/* Контекстная справка (FIN-025). Экран вложен в «Отчёты», и
                ключ из адреса не выводится — поэтому назван явно. */}
            <ScreenHelp topic="cash_flow_articles" />
          </div>
          <p className="mt-1 max-w-[70ch] text-sm text-text-secondary">
            {intl.get('cash_flow_articles.page_hint')}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            {intl.get('cash_flow_articles.from_date')}
            {/* Поле даты ПРОДУКТА, а не браузера: системное рисует дату по
                правилам браузера, и у человека с английским браузером период
                выглядел бы иначе, чем во всех остальных формах (Р3 v26). */}
            <DateField
              value={fromDate}
              onChange={setFromDate}
              className="w-40"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            {intl.get('cash_flow_articles.to_date')}
            <DateField value={toDate} onChange={setToDate} className="w-40" />
          </label>
          <Button variant="secondary" onClick={() => exportCsv?.()}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" onClick={() => exportXlsx?.()}>
            <Download className="mr-2 h-4 w-4" />
            XLSX
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ) : visible.length === 0 ? (
        /**
         * Пустой период объясняет себя и ведёт дальше: «ничего нет» без
         * подсказки читается как поломка, а не как ответ.
         */
        <div className="flex flex-col items-start gap-2 rounded-default border border-border p-6">
          <p className="font-medium">{intl.get('cash_flow_articles.empty')}</p>
          <Link
            to="/cashflow-accounts"
            className="text-sm font-medium underline underline-offset-2"
          >
            {intl.get('cash_flow_articles.empty_action')}
          </Link>
        </div>
      ) : (
        /* Таблица в прокручиваемом контейнере: на телефоне правый край
           иначе просто обрезается, и последние столбцы недоступны (И1 v33). */
        <div className="overflow-x-auto rounded-default border border-border">
          <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-text-secondary">
              <th className="py-2">
                {intl.get('cash_flow_articles.column.name')}
              </th>
              <th className="py-2 text-right">
                {intl.get('cash_flow_articles.column.amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className={
                  isTotalRow(row.rowType)
                    ? 'border-b border-border font-semibold'
                    : 'border-b border-border/50'
                }
              >
                <td className="py-1.5">
                  <span
                    className="flex items-center gap-1"
                    style={{ paddingLeft: `${row.level * 16}px` }}
                  >
                    {row.hasChildren ? (
                      <button
                        type="button"
                        aria-label={row.name}
                        onClick={() => toggle(row.id)}
                        className="text-text-secondary"
                      >
                        {expanded.has(row.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <span className="inline-block w-4" />
                    )}
                    {row.name}
                  </span>
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {row.amount === null
                    ? ''
                    : formatOrganizationMoney(row.amount)}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
