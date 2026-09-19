import * as React from 'react';

import { Money } from '@/components/ui/money';

/**
 * Строка операции НА ТЕЛЕФОНЕ.
 *
 * ЗАЧЕМ. Список операций — главный ежедневный экран, и основатель смотрит его
 * с телефона. Таблица из шести столбцов на экране в 390 точек прокручивается
 * вбок: человек не видит строку целиком и не может сравнить две соседние.
 *
 * Здесь строка выложена так, как её читают: сверху дата и сумма — «когда и
 * сколько», ниже контрагент, ещё ниже назначение платежа. Сумма справа и
 * моноширинными цифрами, как везде: столбец сумм остаётся столбцом.
 */
export interface TransactionMobileRowProps {
  formattedDate?: string | null;
  payee?: string | null;
  description?: string | null;
  formattedAmount?: string | null;
  isDeposit?: boolean;
  /** Что показать четвёртой строкой: счёт или статья. */
  meta?: React.ReactNode;
}

export const TransactionMobileRow = ({
  formattedDate,
  payee,
  description,
  formattedAmount,
  isDeposit,
  meta,
}: TransactionMobileRowProps) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[0.8125rem] text-text-secondary">
        {formattedDate || '—'}
      </span>
      {/* Расход НЕ красный: строка выписки — работа бизнеса, а не авария. */}
      <Money tone={isDeposit ? 'positive' : 'default'}>
        {formattedAmount || '—'}
      </Money>
    </div>

    <span className="truncate text-sm font-medium text-text-primary">
      {payee || '—'}
    </span>

    {description && (
      <span className="line-clamp-2 text-[0.8125rem] text-text-secondary">
        {description}
      </span>
    )}

    {meta && <div className="pt-1">{meta}</div>}
  </div>
);
