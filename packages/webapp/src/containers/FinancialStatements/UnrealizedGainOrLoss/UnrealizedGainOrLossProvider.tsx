import React from 'react';

import FinancialReportPage from '../FinancialReportPage';

const UnrealizedGainOrLossContext = React.createContext<any>(undefined);

/**
 * Unrealized Gain or Loss provider.
 */
function UnrealizedGainOrLossProvider({ filter, ...props }: any) {
  const provider = {};
  return (
    <FinancialReportPage name="unrealized-gain-loss">
      <UnrealizedGainOrLossContext.Provider value={provider} {...props} />
    </FinancialReportPage>
  );
}

const useUnrealizedGainOrLossContext = () =>
  React.useContext(UnrealizedGainOrLossContext);

export { UnrealizedGainOrLossProvider, useUnrealizedGainOrLossContext };
