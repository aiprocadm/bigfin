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
  ];

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-text-primary">
        {intl.get('homepage.money.title')}
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            to={tile.to}
            className="rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-elevated"
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
    </section>
  );
}
