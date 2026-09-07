import React, { createContext } from 'react';
import { DialogContent } from '@/components';
import { useSettingsWarehouseTransfers } from '@/hooks/query';

const WarehouseTransferNumberDilaogContext = createContext<any>(undefined);

/**
 * Warehouse transfer number dialog provier.
 */
function WarehouseTransferNumberDialogProvider({ query, ...props }: any) {
  const { isLoading: isSettingsLoading } = useSettingsWarehouseTransfers();

  // Provider payload.
  const provider = {
    isSettingsLoading,
  };

  return (
    <DialogContent isLoading={isSettingsLoading}>
      <WarehouseTransferNumberDilaogContext.Provider
        value={provider}
        {...props}
      />
    </DialogContent>
  );
}

const useWarehouseTransferNumberDialogContext = () =>
  React.useContext(WarehouseTransferNumberDilaogContext);

export {
  WarehouseTransferNumberDialogProvider,
  useWarehouseTransferNumberDialogContext,
};
