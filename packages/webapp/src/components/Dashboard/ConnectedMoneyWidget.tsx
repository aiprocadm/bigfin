import React from 'react';

import { MoneyWidget } from '@/components/ui/money-widget';
import { formatOrganizationMoney } from '@/utils/organizationMoney';
import { useMoneyWidget } from '@/hooks/query/dashboard';

/**
 * Виджет денег в шапке — подключение к данным (FIN-006 ТЗ-2).
 *
 * СБОЙ РУЧКИ НЕ ЛОМАЕТ ШАПКУ. Шапка есть на каждом экране: упади она — и
 * человек не сможет ни уйти, ни вернуться. Поэтому при ошибке виджет просто
 * не показывается, а не превращается в красное пятно поперёк продукта.
 */
export default function ConnectedMoneyWidget() {
  const { data, isLoading, isError } = useMoneyWidget();

  if (isLoading || isError || !data) return null;

  const widget: any = data;

  return (
    <MoneyWidget
      totalFormatted={widget.total?.formatted ?? ''}
      gap={widget.gap ?? null}
      sparkline={widget.sparkline ?? []}
      accounts={widget.accounts ?? []}
      plannedWithoutAccount={widget.plannedWithoutAccount ?? 0}
      calendarEnabled={widget.calendarEnabled ?? true}
      formatMoney={formatOrganizationMoney}
    />
  );
}
