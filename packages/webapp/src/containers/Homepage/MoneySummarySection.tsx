import * as React from 'react';
import intl from 'react-intl-universal';
import { Link } from 'react-router-dom';

import { useMoneySummary } from './useMoneySummary';

/**
 * Сводка «как дела с деньгами» — первое, что видно на главной (Г2 v20).
 *
 * Раньше главная показывала только кнопки: «создать счёт», «добавить
 * клиента». Человек заходит утром в продукт учёта денег — и не видит денег.
 * Теперь видит: сколько на счетах, сколько должны ему (и сколько из этого
 * просрочено), сколько должен он.
 *
 * Цифры считает сервер теми же отчётами, что показывают разделы продукта:
 * плитка — это ссылка в раздел, где те же суммы можно разобрать построчно.
 */
/** «2026-08-27» → «27 августа» на языке интерфейса. */
const formatDay = (isoDate: string): string => {
  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) return isoDate;

  return new Intl.DateTimeFormat(intl.getInitOptions?.()?.currentLocale || 'ru', {
    day: 'numeric',
    month: 'long',
  }).format(parsed);
};

export default function MoneySummarySection() {
  const { data, isLoading, isError } = useMoneySummary();

  // Пока грузится или если сводка недоступна — просто не показываем блок:
  // пустые прочерки на главной тревожат сильнее, чем их отсутствие.
  if (isLoading || isError || !data) return null;

  const tiles = [
    {
      key: 'cash',
      title: intl.get('homepage.money.cash_balance'),
      value: data.cashBalance?.formattedAmount,
      to: '/cashflow-accounts',
      note: null as string | null,
    },
    {
      key: 'receivable',
      title: intl.get('homepage.money.receivable'),
      value: data.receivable?.formattedAmount,
      to: '/invoices',
      note:
        data.receivableOverdue?.amount > 0
          ? intl.get('homepage.money.overdue_of_it', {
              amount: data.receivableOverdue.formattedAmount,
            })
          : null,
    },
    {
      key: 'payable',
      title: intl.get('homepage.money.payable'),
      value: data.payable?.formattedAmount,
      to: '/bills',
      note:
        data.payableOverdue?.amount > 0
          ? intl.get('homepage.money.overdue_of_it', {
              amount: data.payableOverdue.formattedAmount,
            })
          : null,
    },
    {
      key: 'upcoming',
      title: intl.get('homepage.money.upcoming_payments'),
      value: data.upcomingPayments?.formattedAmount,
      to: '/payment-calendar',
      // День ближайшего платежа подписываем, только когда платить есть что:
      // «ближайший платёж — нет» звучало бы странно.
      note: data.upcomingPaymentsDate
        ? intl.get('homepage.money.nearest_payment', {
            date: formatDay(data.upcomingPaymentsDate),
          })
        : null,
    },
  ];

  // Плитка налога появляется только у организаций на упрощёнке: остальным
  // оценка была бы выдумкой, а выдуманной цифре о налоге верить нельзя.
  if (data.taxEstimate) {
    tiles.push({
      key: 'tax',
      title: intl.get('homepage.money.tax_estimate', {
        rate: data.taxEstimateRatePercent,
      }),
      value: data.taxEstimate.formattedAmount,
      to: '/financial-reports/profit-loss-sheet',
      note: data.taxEstimateDueDate
        ? intl.get('homepage.money.tax_due', {
            date: formatDay(data.taxEstimateDueDate),
          })
        : null,
    });
  }

  // Авансы приходят ТЕМ ЖЕ ответом, что и вся сводка: отдельный запрос
  // ради одной строки был бы вторым запросом на самом частом экране.
  const advancesReceived = Number(data.advancesReceived?.amount ?? 0);
  const advancesPaid = Number(data.advancesPaid?.amount ?? 0);
  const hasAdvances = advancesReceived > 0 || advancesPaid > 0;

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-text-primary">
        {intl.get('homepage.money.title')}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            to={tile.to}
            className="rounded-default border border-border bg-surface p-4 transition-colors hover:bg-surface-elevated"
          >
            <div className="text-sm text-text-secondary">{tile.title}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-text-primary">
              {tile.value}
            </div>
            {tile.note && (
              <div className="mt-1 text-sm text-danger">{tile.note}</div>
            )}
          </Link>
        ))}
      </div>

      {/* АВАНСЫ НАЗВАНЫ ОТДЕЛЬНО (FIN-023). Полученный аванс закрывается
          работой, а выданный — поставкой: в ожидаемые поступления они не
          входят, и сложить их с долгом деньгами значит обещать себе денег
          больше, чем будет. */}
      {hasAdvances && (
        <p className="mt-2 text-sm text-text-secondary">
          {advancesReceived > 0 &&
            intl.get('money_summary.advances_received', {
              amount: data.advancesReceived.formattedAmount,
            })}
          {advancesReceived > 0 && advancesPaid > 0 ? ' · ' : ''}
          {advancesPaid > 0 &&
            intl.get('money_summary.advances_paid', {
              amount: data.advancesPaid.formattedAmount,
            })}
          <span className="ml-1 block text-xs">
            {intl.get('money_summary.advances_hint')}
          </span>
        </p>
      )}

      {data.taxEstimate && (
        <p className="mt-2 text-xs text-text-secondary">
          {intl.get('homepage.money.tax_estimate_hint')}
        </p>
      )}
    </section>
  );
}
