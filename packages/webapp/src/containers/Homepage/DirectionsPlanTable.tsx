import React from 'react';
import intl from 'react-intl-universal';

import { formatOrganizationMoney } from '@/utils/organizationMoney';

import type { DirectionPlanRow } from './useDashboardOverview';
import { formatPercent } from './formatPercent';

/**
 * «Поступления по направлениям» (FT-063 ТЗ-3): сколько планировали получить
 * по каждому направлению, сколько получили и насколько отстали.
 *
 * Блок «Прибыльность направлений» отвечает, какое направление выгоднее;
 * этот — идёт ли каждое по плану. Вопросы разные, поэтому и блоки разные.
 *
 * Направлений нет — таблицы нет вовсе: незачем показывать пустую рамку тому,
 * кто направлениями не пользуется.
 */
export function DirectionsPlanTable({
  rows,
}: {
  rows: DirectionPlanRow[] | null | undefined;
}) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-text-primary">
        {intl.get('dashboard.plan.directions.title')}
      </h3>
      {/* На телефоне пять колонок не помещаются: таблица прокручивается в
          своей рамке, а не растягивает всю страницу вбок. */}
      <div className="overflow-x-auto rounded-default border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-text-secondary">
              <th className="px-3 py-2 font-medium">
                {intl.get('dashboard.plan.directions.name')}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {intl.get('dashboard.plan.directions.completion')}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {intl.get('dashboard.plan.directions.plan')}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {intl.get('dashboard.plan.directions.fact')}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {intl.get('dashboard.plan.directions.deviation')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.projectId ?? 'none'}>
                <td className="px-3 py-2">
                  {/* Операции без направления — отдельной строкой: иначе
                      сумма таблицы не сойдётся с календарём. */}
                  {row.projectId === null
                    ? intl.get('dashboard.plan.directions.unassigned')
                    : row.name}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {/* Без плана процент не считается: прочерк, а не «0 %». */}
                  {row.completionPercent === null
                    ? '—'
                    : `${formatPercent(row.completionPercent)} %`}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatOrganizationMoney(row.plan)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatOrganizationMoney(row.fact)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatOrganizationMoney(row.deviation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DirectionsPlanTable;
