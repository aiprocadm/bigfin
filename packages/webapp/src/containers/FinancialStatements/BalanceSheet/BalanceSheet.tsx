import React, { useEffect } from 'react';
import moment from 'moment';

import { BalanceSheetAlerts, BalanceSheetLoadingBar } from './components';
import { DashboardPageContent } from '@/components';

// D-redesign: панель настроек на общем shadcn-каркасе (v2, тираж пилота ОПиУ).
// Легаси BalanceSheetHeader остаётся на месте (не удаляем).
import { ReportPeriodBar } from '../v2';
import { BalanceSheetHeaderV2 } from './v2/BalanceSheetHeaderV2';
import { BalanceSheetActions } from './BalanceSheetActions';
import { BalanceSheetProvider } from './BalanceSheetProvider';
import { BalanceSheetBody } from './BalanceSheetBody';
import { useBalanceSheetQuery } from './utils';
import { compose } from '@/utils';

import { withBalanceSheetActions } from './withBalanceSheetActions';
import { BalanceSheetDialogs } from './BalanceSheetDialogs';

/**
 * Balance sheet.
 * @returns {React.JSX}
 */
function BalanceSheet({
  // #withBalanceSheetActions
  toggleBalanceSheetFilterDrawer,
}: any) {
  // Balance sheet query.
  const { query, setLocationQuery } = useBalanceSheetQuery();

  // Handle re-fetch balance sheet after filter change.
  const handleFilterSubmit = (filter: any) => {
    const newFilter = {
      ...filter,
      fromDate: moment(filter.fromDate).format('YYYY-MM-DD'),
      toDate: moment(filter.toDate).format('YYYY-MM-DD'),
    };
    setLocationQuery({ ...newFilter });
  };
  // Handle number format submit.
  const handleNumberFormatSubmit = (values: any) => {
    setLocationQuery({
      ...query,
      numberFormat: values,
    });
  };
  // Hides the balance sheet filter drawer once the page unmount.
  useEffect(
    () => () => {
      toggleBalanceSheetFilterDrawer(false);
    },
    [toggleBalanceSheetFilterDrawer],
  );

  return (
    <BalanceSheetProvider filter={query}>
      {/* Старая панель Blueprint (`BalanceSheetActionsBar`) не рисуется:
          её действия — в строке шапки отчёта (UI-049-4 ТЗ-4, O14). Файл не
          удалён — удаление только с разрешения владельца. */}
      <BalanceSheetLoadingBar />
      <BalanceSheetAlerts />

      <DashboardPageContent>
        {/* Период — НА СТРАНИЦЕ, а не внутри панели настроек.
            Его меняют чаще, чем всё остальное в отчёте вместе взятое, а
            стоил он четырёх действий: открыть панель, выбрать даты,
            применить, закрыть. Произвольные даты остались в панели. */}
        <ReportPeriodBar
          range={query as { fromDate?: string; toDate?: string }}
          onRangeChange={(range) => setLocationQuery({ ...query, ...range })}
          onCustomizeClick={() => toggleBalanceSheetFilterDrawer(true)}
          className="mb-4"
          extraSlot={
            <BalanceSheetActions
              numberFormat={query.numberFormat}
              onNumberFormatSubmit={handleNumberFormatSubmit}
            />
          }
        />

        <BalanceSheetHeaderV2
          pageFilter={query}
          onSubmitFilter={handleFilterSubmit}
        />
        <BalanceSheetBody />
      </DashboardPageContent>

      <BalanceSheetDialogs />
    </BalanceSheetProvider>
  );
}

export default compose(withBalanceSheetActions)(BalanceSheet);
