import React from 'react';
import intl from 'react-intl-universal';
import { useQuery } from 'react-query';
import moment from 'moment';
import { X } from 'lucide-react';

import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import useApiRequest from '@/hooks/useRequest';
import { transformToCamelCase } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { transactionsLinkFromDrillDown } from './drillDownRegisterLink';
import { OPEN_DRAWER } from '@/store/types';
import { handleCashFlowTransactionType } from '@/containers/CashFlow/AccountTransactions/utils';

export interface DrillDownTarget {
  /** Раскрытие по счёту — прежнее поведение Баланса, ОПиУ и старого ДДС. */
  accountId?: number;
  accountName?: string;
  /**
   * Раскрытие по СТАТЬЕ (FIN-004 ТЗ-2). Человек, щёлкнувший по «Аренде»,
   * ждёт платежи за аренду, а не выписку по бухгалтерскому счёту.
   */
  articleId?: number;
  articleName?: string;
  fromDate: string;
  toDate: string;
  /**
   * Отбор отчёта, из ячейки которого раскрывают (FT-004 ТЗ-3): без него
   * панель показала бы операции всей группы, и итог не сошёлся бы с ячейкой.
   */
  legalEntityIds?: number[];
  projectsIds?: number[];
  /** Границы всего отчёта — по ним считается «оплачено деньгами». */
  reportFrom?: string;
  reportTo?: string;
  /**
   * Ярус управленческого ОПиУ (FT-010 ТЗ-3): без статьи — весь ярус, со
   * статьёй — статья только в своём ярусе.
   */
  plType?: string;
  /** Метод учёта отчёта: по начислению — все проводки, не только оплаченные. */
  basis?: 'cash' | 'accrual';
  /** Заголовок панели, когда раскрывается ярус целиком. */
  title?: string;
}

interface DrillDownRow {
  date: string;
  transactionNumber: string | null;
  referenceType?: string | null;
  referenceId?: number | null;
  contactName: string | null;
  note: string | null;
  formattedAmount: string;
}

/**
 * Что показывать внизу панели.
 *
 * `turnover` — строка отчёта это ОБОРОТ за период (ОПиУ). Итог списка обязан
 * совпасть с числом, по которому щёлкнули, и этого достаточно.
 *
 * `balance` — строка это ОСТАТОК на дату (Баланс, Движение денег). Сумма
 * операций периода с остатком не сойдётся НИКОГДА: в остатке сидит всё, что
 * накопилось раньше. Показывать один только итог здесь — значит показывать
 * число, которое не сходится с отчётом, и терять доверие ровно там, где
 * раскрытие должно было его вернуть. Поэтому показываем цепочку целиком:
 * остаток на начало + оборот за период = остаток на конец.
 */
export type DrillDownKind = 'turnover' | 'balance';

/**
 * Панель «из чего сложилась сумма» (этап 4 ТЗ, п. 4.2).
 *
 * ТЗ называет это ключевым требованием: «без него пользователь не доверяет
 * цифрам и уходит обратно в Excel». Поэтому итог панели показывается рядом со
 * списком — человек видит, что сумма сходится с той, по которой он щёлкнул.
 */
export default function ReportDrillDownPanel({
  target,
  onClose,
  kind = 'turnover',
}: {
  target: DrillDownTarget | null;
  onClose: () => void;
  kind?: DrillDownKind;
}) {
  const apiRequest = useApiRequest();
  const dispatch = useDispatch();
  // Карточка операции открывается поверх панели — тем же путём, что из
  // реестра: у конкурента из такого списка операцию не открыть вовсе.
  const openTransaction = (row: DrillDownRow) =>
    handleCashFlowTransactionType(
      { reference_type: row.referenceType, reference_id: row.referenceId },
      (name: string, payload: unknown) =>
        dispatch({ type: OPEN_DRAWER, name, payload }),
    );

  const { data, isLoading, isError } = useQuery(
    [
      'REPORT_DRILL_DOWN',
      target?.accountId,
      target?.articleId,
      target?.fromDate,
      target?.toDate,
      target?.legalEntityIds,
      target?.projectsIds,
      target?.reportFrom,
      target?.reportTo,
      target?.plType,
      target?.basis,
    ],
    () =>
      apiRequest
        // Путь именно такой: контроллер объявлен как
        // `@Controller('financial-reports/chart')`, а ручка внутри — как
        // `@Get('drill-down')`. Без `chart` сервер отвечает «Cannot GET»,
        // и панель раскрытия суммы не работала вовсе.
        .get('financial-reports/chart/drill-down', {
          params: {
            // Статья и счёт — два измерения одной ручки. Пустое поле не
            // уходит вовсе: сервер требует хотя бы одно из двух.
            ...(target?.articleId ? { articleId: target.articleId } : {}),
            ...(target?.accountId ? { accountId: target.accountId } : {}),
            from: target?.fromDate,
            to: target?.toDate,
            legalEntityIds: target?.legalEntityIds,
            projectsIds: target?.projectsIds,
            reportFrom: target?.reportFrom,
            reportTo: target?.reportTo,
            plType: target?.plType,
            basis: target?.basis,
          },
        })
        .then((res: any) => transformToCamelCase(res.data)),
    { enabled: Boolean(target?.accountId || target?.articleId || target?.plType) },
  );

  if (!target) return null;

  const rows: DrillDownRow[] = (data as any)?.transactions ?? [];

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-lg">
      <header className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-base font-medium text-text-primary">
            {target.title ??
              (data as any)?.articleName ??
              (data as any)?.accountName ??
              target.articleName ??
              target.accountName ??
              ''}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {moment(target.fromDate).format('D MMM YYYY')} —{' '}
            {moment(target.toDate).format('D MMM YYYY')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          aria-label={intl.get('close')}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <Skeleton className="h-40 w-full" />}

        {isError && (
          <p className="text-sm text-danger">
            {intl.get('reports.drill_down.error')}
          </p>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <p className="text-sm text-text-secondary">
            {intl.get('reports.drill_down.empty')}
          </p>
        )}

        {rows.length > 0 && (
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row, index) => (
              <li
                key={`${row.transactionNumber ?? 'row'}-${index}`}
                className="py-2 text-sm"
              >
                <button
                  type="button"
                  disabled={!row.referenceType || !row.referenceId}
                  onClick={() => openTransaction(row)}
                  aria-label={intl.get('reports.drill_down.open_transaction')}
                  className="flex w-full items-start justify-between gap-3 rounded text-left enabled:hover:bg-surface-elevated"
                >
                <div className="min-w-0">
                  <div className="text-text-primary">
                    {moment(row.date).format('D MMM YYYY')}
                    {row.contactName ? ` · ${row.contactName}` : ''}
                  </div>
                  <div className="truncate text-text-secondary">
                    {row.note || row.transactionNumber || '—'}
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-text-primary">
                  {row.formattedAmount}
                </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/*
        Итог внизу — ради него всё и затевалось: он обязан совпасть с числом,
        по которому человек щёлкнул в отчёте.
      */}
      {(data as any)?.formattedTotal && (
        <footer className="flex flex-col gap-2 border-t border-border p-4 text-sm">
          {kind === 'balance' && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-text-secondary">
                {intl.get('reports.drill_down.opening_balance')}
              </span>
              <span className="tabular-nums text-text-primary">
                {(data as any).formattedOpeningBalance}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-text-secondary">
              {kind === 'balance'
                ? intl.get('reports.drill_down.period_change')
                : intl.get('reports.drill_down.total')}
            </span>
            <span
              className={
                kind === 'balance'
                  ? 'tabular-nums text-text-primary'
                  : 'font-medium tabular-nums text-text-primary'
              }
            >
              {(data as any).formattedTotal}
            </span>
          </div>

          {kind === 'balance' && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="text-text-secondary">
                {intl.get('reports.drill_down.closing_balance')}
              </span>
              <span className="font-medium tabular-nums text-text-primary">
                {(data as any).formattedClosingBalance}
              </span>
            </div>
          )}

          {/* Список обрезан — говорим об этом прямо. Молчание здесь читается
              как «это все операции», и итог внизу выглядит ошибкой. */}
          {(data as any).isTruncated && (
            <p className="text-xs text-text-muted">
              {intl.get('reports.drill_down.truncated', {
                shown: rows.length,
                total: (data as any).transactionsCount,
              })}
            </p>
          )}

          {/*
            ВЫХОД В РЕЕСТР (FIN-005 ТЗ-2).
            Панель показывает первые двести строк и обрывается. Дальше идти
            было некуда: человек вручную воспроизводил отборы в другом
            разделе. Отборы уходят В АДРЕС, поэтому ссылку можно переслать —
            в отличие от конкурента, который передаёт такой переход
            состоянием и ссылку переслать не даёт.
          */}
          {target.articleId ? (
            <Link
              to={transactionsLinkFromDrillDown({
                articleId: target.articleId,
                fromDate: target.fromDate,
                toDate: target.toDate,
                legalEntityIds: target.legalEntityIds,
              })}
              className={buttonVariants({
                variant: 'secondary',
                className: 'mt-1 w-full',
              })}
            >
              {intl.get('reports.drill_down.open_in_transactions')}
            </Link>
          ) : null}
        </footer>
      )}
    </aside>
  );
}
