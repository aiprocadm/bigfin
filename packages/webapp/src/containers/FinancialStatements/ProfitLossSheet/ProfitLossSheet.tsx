import React from 'react';
import { compose } from '@/utils';
import moment from 'moment';
import * as R from 'ramda';

// D-redesign: панель настроек и экшнбар на общем shadcn-каркасе (v2).
// Легаси ProfitLossSheetHeader/ProfitLossActionsBar остаются на месте (не удаляем).
import { ProfitLossHeaderV2 } from './v2/ProfitLossHeaderV2';
import { ProfitLossToolbarV2 } from './v2/ProfitLossToolbarV2';
import { ProfitLossBasisSwitch } from './v2/ProfitLossBasisSwitch';
import type { AccountingBasis } from '../accountingBasis';

import { DashboardPageContent } from '@/components';

import { withDashboardActions } from '@/containers/Dashboard/withDashboardActions';
import { withProfitLossActions } from './withProfitLossActions';

import { useProfitLossSheetQuery } from './utils';
import { ProfitLossSheetProvider } from './ProfitLossProvider';
import { ProfitLossSheetAlerts, ProfitLossSheetLoadingBar } from './components';
import { ProfitLossBody } from './ProfitLossBody';
import { ProfitLossSheetDialogs } from './ProfitLossSheetDialogs';

/**
 * Profit/Loss financial statement sheet.
 * @returns {React.JSX}
 */
function ProfitLossSheet({
  // #withProfitLossActions
  toggleProfitLossFilterDrawer: toggleDisplayFilterDrawer,
}: {
  toggleProfitLossFilterDrawer: (open?: boolean) => void;
}) {
  // Profit/loss sheet query.
  const { query, setLocationQuery } = useProfitLossSheetQuery();

  // Handle submit filter.
  const handleSubmitFilter = (filter: Record<string, any>) => {
    const newFilter = {
      ...filter,
      fromDate: moment(filter.fromDate).format('YYYY-MM-DD'),
      toDate: moment(filter.toDate).format('YYYY-MM-DD'),
    };
    setLocationQuery(newFilter);
  };
  // Смена метода учёта: адрес — единственное место, где живёт метод,
  // поэтому отчёт перезапрашивается тем же путём, что и любой другой отбор.
  const handleBasisChange = (basis: AccountingBasis) => {
    setLocationQuery({ ...query, basis });
  };

  // Handle number format submit.
  const handleNumberFormatSubmit = (numberFormat: Record<string, any>) => {
    setLocationQuery({
      ...query,
      numberFormat,
    });
  };
  // Hide the filter drawer once the page unmount.
  React.useEffect(
    () => () => {
      toggleDisplayFilterDrawer(false);
    },
    [toggleDisplayFilterDrawer],
  );

  return (
    <ProfitLossSheetProvider query={query}>
      <ProfitLossToolbarV2
        numberFormat={query.numberFormat}
        onNumberFormatSubmit={handleNumberFormatSubmit}
      />
      <ProfitLossSheetLoadingBar />
      <ProfitLossSheetAlerts />

      <DashboardPageContent>
        <ProfitLossHeaderV2
          pageFilter={query}
          onSubmitFilter={handleSubmitFilter}
        />
        {/*
          Переключатель метода учёта прямо в шапке (п. 4.3 ТЗ): раньше он
          лежал в панели «Настроить отчёт», и человек не знал ни что метода
          два, ни каким посчитаны цифры перед ним.
        */}
        <ProfitLossBasisSwitch
          basis={query.basis}
          onChange={handleBasisChange}
        />
        <ProfitLossBody />
      </DashboardPageContent>

      <ProfitLossSheetDialogs />
    </ProfitLossSheetProvider>
  );
}

// Тип указан явно: `R.compose` возвращает обобщённую функцию, и загрузчик
// страниц (`lazy`) не признаёт её за компонент — маршрут отчёта краснел
// проверкой типов, хотя экран работает (карта v52).
export default compose(
  withDashboardActions,
  withProfitLossActions,
)(ProfitLossSheet) as React.ComponentType;
