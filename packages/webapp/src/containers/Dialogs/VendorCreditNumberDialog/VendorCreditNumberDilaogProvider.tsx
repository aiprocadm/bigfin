import React from 'react';
import { DialogContent } from '@/components';
import { useSettingsVendorCredits } from '@/hooks/query';

const VendorCreditNumberDialogContext = React.createContext<any>(undefined);

/**
 * Vendor credit number dialog provider
 */
function VendorCreditNumberDilaogProvider({ query, ...props }: any) {
  const { isLoading: isSettingsLoading } = useSettingsVendorCredits();

  // Provider payload.
  const provider = {
    isSettingsLoading,
  };

  return (
    <DialogContent isLoading={isSettingsLoading}>
      <VendorCreditNumberDialogContext.Provider value={provider} {...props} />
    </DialogContent>
  );
}

const useVendorCreditNumberDialogContext = () =>
  React.useContext(VendorCreditNumberDialogContext);

export { VendorCreditNumberDilaogProvider, useVendorCreditNumberDialogContext };
