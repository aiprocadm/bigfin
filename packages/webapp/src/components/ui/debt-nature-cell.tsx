import * as React from 'react';
import intl from 'react-intl-universal';

import { formatOrganizationMoney } from '@/utils/organizationMoney';
import type { DebtSide } from '@/hooks/query/contacts';

export interface DebtNatureCellProps {
  side?: DebtSide;
}

/**
 * Клетка долга, разделённого по природе (FIN-023 ТЗ-2).
 *
 * ПОЧЕМУ ДВЕ СТРОКИ, А НЕ ОДНА СУММА. Деньги придут на счёт, а аванс
 * закрывать придётся работой. Сложенные вместе, они обещают денег больше,
 * чем будет, и человек планирует платежи, которых нечем закрыть.
 *
 * Вторая строка появляется, только когда неденежная часть есть. Постоянная
 * строка «поставкой: 0 ₽» удлиняла бы каждую строку таблицы ради тишины.
 */
export function DebtNatureCell({ side }: DebtNatureCellProps) {
  const money = Number(side?.money ?? 0);
  const goods = Number(side?.goods ?? 0);

  // Долга нет — знак «нет», а не ноль. Ноль читается как сумма.
  if (!money && !goods) {
    return <span className="text-text-muted">—</span>;
  }

  return (
    <span className="flex flex-col items-end">
      <span className="tabular-nums">{formatOrganizationMoney(money)}</span>
      {goods !== 0 && (
        <span className="text-xs text-text-secondary">
          {intl.get('debt_nature.goods_short', {
            amount: formatOrganizationMoney(goods),
          })}
        </span>
      )}
    </span>
  );
}
