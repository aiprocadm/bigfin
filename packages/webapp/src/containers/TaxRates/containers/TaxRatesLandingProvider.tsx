// @ts-nocheck
import React from 'react';
import { isEmpty } from 'lodash';
import { DashboardInsider } from '@/components/Dashboard';
import { useTaxRates } from '@/hooks/query/taxRates';

const TaxRatesLandingContext = React.createContext<any>(undefined);

/**
 * Cash Flow data provider.
 */
/**
 * Раньше в разборе стоял `tableState` — его не передаёт никто и не читает сам
 * поставщик, но проверка считала его обязательным, и экран ставок налога был
 * ошибкой (Д33 карты v75).
 */
function TaxRatesLandingProvider({
  ...props
}: {
  children?: React.ReactNode;
}) {
  // Fetch cash flow list .
  const {
    data: taxRates,
    isFetching: isTaxRatesFetching,
    isLoading: isTaxRatesLoading,
  } = useTaxRates({}, { keepPreviousData: true });

  // Detarmines whether the table should show empty state.
  const isEmptyStatus = isEmpty(taxRates) && !isTaxRatesLoading;

  // Provider payload.
  const provider = {
    taxRates,
    isTaxRatesFetching,
    isTaxRatesLoading,
    isEmptyStatus
  };

  return (
    <DashboardInsider name={'tax-rate-form'}>
      <TaxRatesLandingContext.Provider value={provider} {...props} />
    </DashboardInsider>
  );
}

const useTaxRatesLandingContext = () =>
  React.useContext(TaxRatesLandingContext);

export { TaxRatesLandingProvider, useTaxRatesLandingContext };
