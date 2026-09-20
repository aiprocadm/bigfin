// © 2026 Bigfin
import React from 'react';
import intl from 'react-intl-universal';

import { useDataQualityDriftedBalances } from '@/hooks/query/dataQuality';
import { formatOrganizationMoney } from '@/utils/organizationMoney';

/**
 * «Остаток счёта разошёлся с проводками».
 *
 * НАЙДЕНО ЖИВЫМ ПРОХОДОМ ПО СТЕНДУ. Шапка показывала 1 749 839,09 ₽, а
 * отчёт о движении денег — 1 748 838,59 ₽. Разошлись на 1 000,50 ₽ по одной
 * кассе, и ни один экран не объяснял, какая сумма настоящая.
 *
 * ПРИЧИНА ДВОЙСТВЕННОСТИ. Остаток хранится и в колонке счёта (её показывают
 * шапка и главная — это быстро), и в проводках (по ним строятся отчёты —
 * это правда). Пока они совпадают, о двойственности никто не думает.
 *
 * ЧИНИТЬ САМИ НЕ БЕРЁМСЯ. Какая сумма верна, решает человек: колонка могла
 * отстать от проводок, а могла и правильно хранить начальный остаток,
 * который в проводки не попал. Молча переписать деньги в базе — худшее, что
 * здесь можно сделать.
 */
export function DriftedBalancesTab() {
  const { data } = useDataQualityDriftedBalances({});

  const rows: any[] = data?.rows ?? [];
  const totalDifference = Number(data?.totalDifference ?? 0);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">
        {intl.get('data_quality.drifted_balances.title')}
      </h2>
      <p className="text-muted-foreground text-sm">
        {intl.get('data_quality.drifted_balances.description')}
      </p>

      {rows.length === 0 ? (
        <p className="text-sm">
          {intl.get('data_quality.drifted_balances.empty')}
        </p>
      ) : (
        <>
          <p className="text-sm font-medium">
            {intl.get('data_quality.drifted_balances.total', {
              amount: formatOrganizationMoney(totalDifference),
            })}
          </p>

          {/* Таблица прокручивается внутри себя: на телефоне страница не
              должна ездить вбок. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-2 pr-4">
                    {intl.get('data_quality.drifted_balances.account')}
                  </th>
                  <th className="py-2 pr-4 text-right">
                    {intl.get('data_quality.drifted_balances.stored')}
                  </th>
                  <th className="py-2 pr-4 text-right">
                    {intl.get('data_quality.drifted_balances.ledger')}
                  </th>
                  <th className="py-2 text-right">
                    {intl.get('data_quality.drifted_balances.difference')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{row.name}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatOrganizationMoney(Number(row.storedAmount))}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatOrganizationMoney(Number(row.ledgerAmount))}
                    </td>
                    <td className="py-2 text-right font-medium tabular-nums">
                      {formatOrganizationMoney(Number(row.difference))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-muted-foreground text-sm">
            {intl.get('data_quality.drifted_balances.hint')}
          </p>
        </>
      )}
    </div>
  );
}
