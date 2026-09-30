import * as React from 'react';
import intl from 'react-intl-universal';

import { cn } from '@/lib/cn';
import { Money } from '@/components/ui/money';
import { useMoneyWidget } from '@/hooks/query/dashboard';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

/** Цвета долей: те же ряды палитры графиков, по порядку (§6.2 ТЗ-4). */
const TONES = ['bg-chart-1', 'bg-chart-4', 'bg-chart-5', 'bg-chart-6', 'bg-chart-7', 'bg-chart-8', 'bg-chart-2', 'bg-chart-3'];

/**
 * «Где лежат деньги» над карточками счетов (C15, UI-051-1 ТЗ-4).
 *
 * БЫЛО (O12): карточки счетов без общего итога — чтобы узнать, сколько
 * денег всего, их складывали в уме. Теперь сверху итог крупно и одна полоса
 * 100 %, разрезанная по счетам с положительным остатком. Счета с минусом в
 * полосу не попадают (доля от целого у них не определена) — их видно в
 * списке под ней.
 *
 * Данные — тот же ответ, что у виджета денег в шапке: второго запроса нет.
 */
export function AccountsSummary() {
  // Право на деньги хук проверяет сам: без него запроса нет (FT-084).
  const { data } = useMoneyWidget();
  const widget: any = data;
  if (!widget?.total) return null;

  const accounts: Array<{ accountId: number; accountName: string; balance: number }> = widget.accounts ?? [];
  const positive = accounts.filter((account) => account.balance > 0);
  const sum = positive.reduce((total, account) => total + account.balance, 0);

  return (
    <section aria-labelledby="accounts-summary-title" className="bigfin-ui mx-2 mb-2 mt-4 flex flex-col gap-3 px-2">
      <div className="flex flex-col items-start">
        <span id="accounts-summary-title" className="text-subhead text-text-secondary">
          {intl.get('cashflow.accounts.total')}
        </span>
        <Money hero align="left">{widget.total.formatted}</Money>
      </div>
      {sum > 0 && positive.length > 1 && (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-fill-1" role="img" aria-label={intl.get('cashflow.accounts.where')}>
            {positive.map((account, index) => (
              <div
                key={account.accountId}
                className={cn('h-full', TONES[index % TONES.length])}
                style={{ width: `${(account.balance / sum) * 100}%` }}
                title={`${account.accountName}: ${formatOrganizationMoney(account.balance)}`}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {positive.map((account, index) => (
              <li key={account.accountId} className="flex items-center gap-1.5 text-footnote text-text-secondary">
                <span aria-hidden className={cn('inline-block h-2 w-2 rounded-full', TONES[index % TONES.length])} />
                {account.accountName}
                <span className="tabular-nums text-text-primary">{formatOrganizationMoney(account.balance)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
