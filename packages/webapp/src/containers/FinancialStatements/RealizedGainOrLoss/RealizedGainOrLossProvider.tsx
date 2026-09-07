import React from 'react';
import FinancialReportPage from '../FinancialReportPage';

const RealizedGainOrLossContext = React.createContext<any>(undefined);

/**
 * Realized Gain or Loss provider.
 */
function RealizedGainOrLossProvider({ filter, ...props }: any) {
  const provider = {};

  return (
    <FinancialReportPage name="realized-gain-loss">
      <RealizedGainOrLossContext.Provider value={provider} {...props} />
    </FinancialReportPage>
  );
}

const useRealizedGainOrLossContext = () =>
  React.useContext(RealizedGainOrLossContext);

export { RealizedGainOrLossProvider, useRealizedGainOrLossContext };
