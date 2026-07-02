import { ReactNode } from 'react';
import intl from 'react-intl-universal';

import { Card } from '@/components/ui/card';

import type { ExpenseDetail } from './types';

const EMPTY_VALUE = '—';

function DetailRow({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className="m-0 text-right text-sm text-text-primary">
        {children ?? EMPTY_VALUE}
      </dd>
    </div>
  );
}

function CardTitleSm({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-text-secondary">{children}</h3>
  );
}

/**
 * Карточки деталей расхода: сумма (крупно, tabular-nums) + реквизиты,
 * категории (счёт расхода, описание, сумма).
 */
export function ExpenseDrawerCardsV2({ expense }: { expense: ExpenseDetail }) {
  const categories = expense.categories ?? [];

  return (
    <>
      {/* Сумма + реквизиты. */}
      <Card className="p-4 sm:p-5">
        <div className="text-sm text-text-secondary">
          {intl.get('full_amount')}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-text-primary">
          {expense.formatted_amount || EMPTY_VALUE}
        </div>

        <dl className="m-0 mt-4">
          <DetailRow label={intl.get('date')}>
            {expense.formatted_date || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('reference_no')}>
            {expense.reference_no || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('description')}>
            {expense.description || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('published_at')}>
            {expense.formatted_published_at || EMPTY_VALUE}
          </DetailRow>
          <DetailRow label={intl.get('created_at')}>
            {expense.formatted_created_at || EMPTY_VALUE}
          </DetailRow>
        </dl>
      </Card>

      {/* Категории (позиции расхода). */}
      <Card className="p-4 sm:p-5">
        <CardTitleSm>{intl.get('expense.drawer.section.categories')}</CardTitleSm>

        <div className="mt-3 flex flex-col">
          {categories.length ? (
            categories.map((category, index) => (
              <div
                key={index}
                className="flex items-baseline justify-between gap-4 border-t border-border py-2.5 first:border-t-0 first:pt-0"
              >
                <div className="min-w-0">
                  <div className="text-sm text-text-primary">
                    {category.expense_account?.name || EMPTY_VALUE}
                  </div>
                  {category.description ? (
                    <div className="text-xs text-text-muted">
                      {category.description}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-sm font-medium tabular-nums text-text-primary">
                  {category.amount_formatted || EMPTY_VALUE}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-text-muted">{EMPTY_VALUE}</div>
          )}
        </div>
      </Card>
    </>
  );
}
