// © 2026 Bigfin
import * as React from 'react';
import intl from 'react-intl-universal';
import { useFormContext } from 'react-hook-form';

import { ReportCheckboxRow } from './FinancialHeaderBranchesField';

/**
 * Сравнение с прошлым периодом (остаток О3 ТЗ).
 *
 * ТРИ ВЫКЛЮЧАТЕЛЯ, А НЕ ОДИН. Показать сам прошлый период, показать изменение
 * в деньгах, показать изменение в процентах. Разделены не ради гибкости, а
 * ради ширины экрана: три лишние колонки на каждый период превращают таблицу
 * в простыню, и сами числа в ней теряются.
 *
 * ПРАВИЛО СВЯЗИ. Снятие родителя снимает дочерние: изменение к периоду,
 * которого на экране нет, читать не с чем. Включение дочернего включает
 * родителя по той же причине.
 *
 * Правило повторяет поведение Баланса и ОПиУ дословно — человек не должен
 * заново разбираться, как устроены настройки, переходя между отчётами.
 */
export function ReportPreviousPeriodFields() {
  const form = useFormContext();
  const values = form.watch();

  const set = (name: string, value: boolean) => form.setValue(name, value);

  const handleParent = (checked: boolean) => {
    set('previousPeriod', checked);

    if (!checked) {
      set('previousPeriodAmountChange', false);
      set('previousPeriodPercentageChange', false);
    }
  };

  const handleAmount = (checked: boolean) => {
    if (checked) set('previousPeriod', true);
    set('previousPeriodAmountChange', checked);
  };

  const handlePercentage = (checked: boolean) => {
    if (checked) set('previousPeriod', true);
    set('previousPeriodPercentageChange', checked);
  };

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <ReportCheckboxRow
        label={intl.get('cash_flow_statement.previous_period')}
        checked={Boolean(values.previousPeriod)}
        onCheckedChange={handleParent}
      />

      <div className="flex flex-col gap-2 pl-6 sm:flex-row sm:gap-6">
        <ReportCheckboxRow
          label={intl.get('cash_flow_statement.total_change')}
          checked={Boolean(values.previousPeriodAmountChange)}
          onCheckedChange={handleAmount}
        />
        <ReportCheckboxRow
          label={intl.get('cash_flow_statement.change')}
          checked={Boolean(values.previousPeriodPercentageChange)}
          onCheckedChange={handlePercentage}
        />
      </div>
    </div>
  );
}
